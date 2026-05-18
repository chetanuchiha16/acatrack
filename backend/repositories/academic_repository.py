from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import AcademicResult, Subject, StudentAuth, Section, ParentAuth
from typing import List, Dict, Any


class AcademicRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_all_subjects(self) -> List[Subject]:
        result = await self.db.execute(select(Subject))
        return result.scalars().all()

    async def upsert_subject(
        self, code: str, name: str, semester: str, credits: int
    ) -> tuple[bool, bool]:
        """Returns (inserted, updated)"""
        stmt = select(Subject).where(Subject.subject_code == code)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.subject_name = name
            existing.credits = credits
            existing.semester = semester
            return False, True
        else:
            new_sub = Subject(
                subject_code=code, subject_name=name, semester=semester, credits=credits
            )
            self.db.add(new_sub)
            return True, False

    async def get_section_by_name_and_batch(
        self, section_name: str, batch_year: int
    ) -> Section | None:
        stmt = select(Section).where(
            Section.name == section_name, Section.batch_year == batch_year
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_sections_by_batch(self, batch_year: int) -> List[Section]:
        stmt = (
            select(Section)
            .where(Section.batch_year == batch_year)
            .order_by(Section.name)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def upsert_student_enrollment(
        self,
        usn: str,
        name: str,
        email: str,
        phone: str,
        batch_year: int,
        section_id: int,
        hash_pw_fn,
    ) -> tuple[bool, bool]:
        """Returns (inserted, updated)"""
        stmt = select(StudentAuth).where(StudentAuth.usn == usn)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()

        if existing:
            existing.name = name
            existing.section_id = section_id
            existing.batch_year = batch_year
            if email and email.lower() != "nan":
                existing.student_email = email
            if phone and phone.lower() != "nan":
                existing.student_phno = phone
            return False, True
        else:
            student = StudentAuth(
                usn=usn,
                name=name,
                batch_year=batch_year,
                section_id=section_id,
                student_email=email if email and email.lower() != "nan" else None,
                student_phno=phone if phone and phone.lower() != "nan" else None,
            )
            self.db.add(student)
            await self.db.flush()

            parent_username = f"{usn}_parent"
            p_stmt = select(ParentAuth).where(ParentAuth.username == parent_username)
            existing_p = (await self.db.execute(p_stmt)).scalar_one_or_none()
            if not existing_p:
                parent = ParentAuth(
                    username=parent_username,
                    password=hash_pw_fn("default123"),
                    name=f"Parent of {name}",
                    student_id=student.id,
                )
                self.db.add(parent)
            return True, False

    async def get_semester_summary_stats(
        self, semester: str, batch_year: int, section_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates all summary statistics (Total, Pass, Fail, FCD, etc.)
        for all subjects in a semester using a single SQL aggregation.
        FAANG-level optimization: Compute at the source (SQL) instead of Python loops.
        """
        # Define pass criteria once
        # Pass = (SEE >= 18 and IA >= 20) OR (SEE == 0 and IA >= 20)
        # Note: This logic follows utils/grading.py

        is_pass = case(
            (
                (Subject.credits > 0)
                & (AcademicResult.see_marks >= 18)
                & (AcademicResult.ia_marks >= 20),
                True,
            ),
            ((Subject.credits == 0) & (AcademicResult.ia_marks >= 20), True),
            # Special case for subjects where SEE might be 0 but credits > 0 (e.g. labs?)
            # Legacy code used see == 0 as a proxy. Let's combine.
            (
                (Subject.credits > 0)
                & (AcademicResult.see_marks == 0)
                & (AcademicResult.ia_marks >= 20),
                True,
            ),
            else_=False,
        )

        marks = case(
            (AcademicResult.see_marks == 0, AcademicResult.ia_marks),
            else_=AcademicResult.total_marks,
        )

        query = (
            select(
                Subject.subject_code,
                Subject.subject_name,
                func.count(AcademicResult.student_id).label("total_students"),
                # Present is assumed if there's a record in AcademicResult in this normalized schema
                func.count(AcademicResult.student_id).label("present_students"),
                func.sum(case((is_pass, 1), else_=0)).label("pass_count"),
                func.sum(case((~is_pass, 1), else_=0)).label("fail_count"),
                func.sum(case(((is_pass) & (marks >= 70), 1), else_=0)).label(
                    "fcd_count"
                ),
                func.sum(
                    case(((is_pass) & (marks >= 60) & (marks < 70), 1), else_=0)
                ).label("fc_count"),
                func.sum(
                    case(((is_pass) & (marks >= 35) & (marks < 60), 1), else_=0)
                ).label("sc_count"),
            )
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .join(StudentAuth, AcademicResult.student_id == StudentAuth.id)
            .where(
                Subject.semester == semester, AcademicResult.batch_year == batch_year
            )
        )

        if section_name and section_name != "ALL":
            query = query.join(Section, StudentAuth.section_id == Section.id).where(
                Section.name == section_name
            )

        query = query.group_by(Subject.subject_code, Subject.subject_name)

        result = await self.db.execute(query)
        stats = []
        for row in result.all():
            pass_percentage = (
                (row.pass_count / row.present_students * 100)
                if row.present_students > 0
                else 0
            )
            stats.append(
                {
                    "subject_code": row.subject_code,
                    "subject_name": row.subject_name,
                    "total_students": row.total_students,
                    "present_students": row.present_students,
                    "absent_students": 0,  # In current normalized DB, absence might be handled differently
                    "pass_count": row.pass_count,
                    "fail_count": row.fail_count,
                    "pass_percentage": round(pass_percentage, 2),
                    "fcd_count": row.fcd_count,
                    "fc_count": row.fc_count,
                    "sc_count": row.sc_count,
                }
            )
        return stats

    async def get_toppers_by_percentage(
        self, semester: str, batch_year: int, limit: int = 10, section_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches toppers for a semester using SQL sorting and projection.
        FAANG-level optimization: Use CTE for aggregation and percentage calculation.
        """
        # Define pass/fail flag per subject record
        is_fail = case(
            (
                (Subject.credits > 0)
                & ((AcademicResult.see_marks < 18) | (AcademicResult.ia_marks < 20)),
                1,
            ),
            ((Subject.credits == 0) & (AcademicResult.ia_marks < 20), 1),
            else_=0,
        )

        # Aggregate per student
        topper_query = (
            select(
                StudentAuth.usn,
                StudentAuth.name,
                func.sum(AcademicResult.ia_marks + AcademicResult.see_marks).label(
                    "total_marks_sum"
                ),
                func.count(AcademicResult.subject_code).label("num_subjects"),
                func.sum(is_fail).label("fail_count"),
            )
            .join(AcademicResult, StudentAuth.id == AcademicResult.student_id)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .where(
                Subject.semester == semester, AcademicResult.batch_year == batch_year
            )
        )

        if section_name and section_name != "ALL":
            topper_query = topper_query.join(
                Section, StudentAuth.section_id == Section.id
            ).where(Section.name == section_name)

        topper_query = topper_query.group_by(
            StudentAuth.id, StudentAuth.usn, StudentAuth.name
        )

        result = await self.db.execute(topper_query)
        toppers = []
        for row in result.all():
            percentage = (
                (row.total_marks_sum / (row.num_subjects * 100) * 100)
                if row.num_subjects > 0
                else 0
            )
            pass_fail = "Fail" if row.fail_count > 0 else "Pass"

            toppers.append(
                {
                    "usn": row.usn,
                    "name": row.name,
                    "percentage": round(percentage, 2),
                    "pass_fail": pass_fail,
                    "num_subjects": row.num_subjects,
                }
            )

        # Sort in memory since we already have the list, or we could do it in SQL.
        # SQL sorting is usually better for large data, but we already have the percentage here.
        toppers.sort(key=lambda x: x["percentage"], reverse=True)
        return toppers[:limit]

    async def get_semester_cohort_stats(
        self, semester: str, batch_year: int, section_name: str = None
    ) -> Dict[str, Any]:
        """
        Calculates cohort-wide statistics (FCD, FC, SC, Pass %, Total Students)
        using SQl aggregation.
        """
        # We need to calculate percentage per student then aggregate
        # For simplicity in this schema, we can use a subquery
        subq = (
            select(
                StudentAuth.id,
                func.sum(AcademicResult.ia_marks + AcademicResult.see_marks).label(
                    "total_marks"
                ),
                func.count(AcademicResult.subject_code).label("num_subjects"),
                func.sum(
                    case(
                        (
                            (AcademicResult.see_marks < 18)
                            | (AcademicResult.ia_marks < 20),
                            1,
                        ),
                        else_=0,
                    )
                ).label("fail_count"),
            )
            .join(AcademicResult, StudentAuth.id == AcademicResult.student_id)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .where(
                Subject.semester == semester, AcademicResult.batch_year == batch_year
            )
        )

        if section_name and section_name != "ALL":
            subq = subq.join(Section, StudentAuth.section_id == Section.id).where(
                Section.name == section_name
            )

        subq = subq.group_by(StudentAuth.id).subquery()

        avg_marks = subq.c.total_marks / subq.c.num_subjects

        query = select(
            func.count(subq.c.id).label("total_students"),
            func.sum(case((subq.c.fail_count > 0, 1), else_=0)).label("total_fail"),
            func.sum(
                case(((subq.c.fail_count == 0) & (avg_marks >= 70), 1), else_=0)
            ).label("total_fcd"),
            func.sum(
                case(
                    (
                        (subq.c.fail_count == 0) & (avg_marks >= 60) & (avg_marks < 70),
                        1,
                    ),
                    else_=0,
                )
            ).label("total_fc"),
            func.sum(
                case(
                    (
                        (subq.c.fail_count == 0) & (avg_marks >= 35) & (avg_marks < 60),
                        1,
                    ),
                    else_=0,
                )
            ).label("total_sc"),
        )

        result = await self.db.execute(query)
        row = result.one()

        total = row.total_students or 0
        fail = row.total_fail or 0
        pass_count = total - fail
        pass_pct = (pass_count / total * 100) if total > 0 else 0

        return {
            "total_students": total,
            "total_fail": fail,
            "total_fcd": row.total_fcd or 0,
            "total_fc": row.total_fc or 0,
            "total_sc": row.total_sc or 0,
            "pass_percentage": round(pass_pct, 2),
        }

    async def get_semester_failed_students(
        self, semester: str, batch_year: int
    ) -> List[Dict[str, Any]]:
        """
        Fetches a list of students who failed at least one subject in the semester.
        FAANG-level optimization: Use SQL grouping to collect failed subjects directly.
        """
        # Define pass criteria (IA pass mark 20, SEE pass mark 18)
        is_fail = case(
            (
                (Subject.credits > 0)
                & ((AcademicResult.see_marks < 18) | (AcademicResult.ia_marks < 20)),
                True,
            ),
            ((Subject.credits == 0) & (AcademicResult.ia_marks < 20), True),
            else_=False,
        )

        query = (
            select(
                StudentAuth.usn,
                func.string_agg(AcademicResult.subject_code, ", ").label(
                    "failed_subject_codes"
                ),
            )
            .join(AcademicResult, StudentAuth.id == AcademicResult.student_id)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .where(
                Subject.semester == semester,
                AcademicResult.batch_year == batch_year,
                is_fail,
            )
            .group_by(StudentAuth.usn)
        )

        result = await self.db.execute(query)
        return [
            {"usn": row.usn, "subject_codes": row.failed_subject_codes.split(", ")}
            for row in result.all()
        ]
