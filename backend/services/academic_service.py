from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.schema import (
    Section,
    Subject,
    StudentAuth,
    ParentAuth,
    SubjectAssignment,
    Teacher,
    BatchLifecycle,
    BatchStatus,
)
from security import hash_password
from logger_config import get_logger
from typing import List, Dict

from repositories.academic_repository import AcademicRepository

logger = get_logger(__name__)


class AcademicService:
    @staticmethod
    async def get_all_subjects(session: AsyncSession):
        repo = AcademicRepository(session)
        return await repo.get_all_subjects()

    @staticmethod
    async def get_sections_by_batch(session: AsyncSession, batch_year: int):
        repo = AcademicRepository(session)
        return await repo.get_sections_by_batch(batch_year)

    @staticmethod
    async def bulk_upsert_subjects(
        session: AsyncSession, semester: str, subjects_data: List[Dict]
    ):
        repo = AcademicRepository(session)
        inserted = 0
        updated = 0
        for sub in subjects_data:
            ins, upd = await repo.upsert_subject(
                code=sub["code"],
                name=sub["name"],
                semester=semester,
                credits=sub["credits"],
            )
            if ins:
                inserted += 1
            if upd:
                updated += 1
        await session.commit()
        return inserted, updated

    @staticmethod
    async def bulk_upsert_students(
        session: AsyncSession,
        batch_year: int,
        section_name: str,
        students_data: List[Dict],
        hash_pw_fn,
    ):
        repo = AcademicRepository(session)
        section = await repo.get_section_by_name_and_batch(section_name, batch_year)
        if not section:
            raise ValueError(
                f"Section {section_name} for batch {batch_year} not found. Initialize batch first."
            )

        inserted = 0
        updated = 0
        for student in students_data:
            ins, upd = await repo.upsert_student_enrollment(
                usn=student["usn"],
                name=student["name"],
                email=student["email"],
                phone=student["phone"],
                batch_year=batch_year,
                section_id=section.id,
                hash_pw_fn=hash_pw_fn,
            )
            if ins:
                inserted += 1
            if upd:
                updated += 1
        await session.commit()
        return inserted, updated

    @staticmethod
    async def initialize_batch(
        session: AsyncSession, batch_year: int, sections: List[str]
    ):
        """Creates sections for a given batch year if they don't already exist."""
        for section_name in sections:
            stmt = select(Section).where(
                Section.name == section_name, Section.batch_year == batch_year
            )
            result = await session.execute(stmt)
            if not result.scalar_one_or_none():
                new_section = Section(name=section_name, batch_year=batch_year)
                session.add(new_section)
                logger.info(f"Created section {section_name} for batch {batch_year}")
        await session.commit()

    @staticmethod
    async def register_subjects(
        session: AsyncSession, semester: str, subjects: List[Dict]
    ):
        """
        Registers or updates subjects for a specific semester.
        subjects: [{'code': 'CS101', 'name': 'Intro to CS', 'credits': 4}, ...]
        """
        for sub_data in subjects:
            code = sub_data["code"].strip().upper()
            stmt = select(Subject).where(Subject.subject_code == code)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                existing.subject_name = sub_data["name"]
                existing.credits = sub_data["credits"]
                existing.semester = semester.lower().strip()
                logger.debug(f"Updated subject {code}")
            else:
                new_sub = Subject(
                    subject_code=code,
                    subject_name=sub_data["name"],
                    semester=semester.lower().strip(),
                    credits=sub_data["credits"],
                )
                session.add(new_sub)
                logger.info(f"Registered new subject {code}")
        await session.commit()

    @staticmethod
    async def enroll_students(
        session: AsyncSession, batch_year: int, section_name: str, students: List[Dict]
    ):
        """
        Enrolls a list of students into a specific batch and section.
        Creates parent account shells automatically.
        students: [{'usn': '...', 'name': '...', 'email': '...', 'phone': '...'}, ...]
        """
        stmt = select(Section).where(
            Section.name == section_name, Section.batch_year == batch_year
        )
        section = (await session.execute(stmt)).scalar_one_or_none()
        if not section:
            raise ValueError(
                f"Section {section_name} for batch {batch_year} not found. Initialize batch first."
            )

        for s_data in students:
            usn = s_data["usn"].strip().upper()
            stmt = select(StudentAuth).where(StudentAuth.usn == usn)
            student = (await session.execute(stmt)).scalar_one_or_none()

            if student:
                student.name = s_data["name"]
                student.section_id = section.id
                student.batch_year = batch_year
                logger.debug(f"Updated student {usn}")
            else:
                student = StudentAuth(
                    usn=usn,
                    name=s_data["name"],
                    batch_year=batch_year,
                    section_id=section.id,
                    student_email=s_data.get("email"),
                    student_phno=s_data.get("phone"),
                )
                session.add(student)
                await session.flush()

                # Create Parent shell
                parent_username = f"{usn}_parent"
                # Check if parent already exists (unlikely but safe)
                p_stmt = select(ParentAuth).where(
                    ParentAuth.username == parent_username
                )
                if not (await session.execute(p_stmt)).scalar_one_or_none():
                    parent = ParentAuth(
                        username=parent_username,
                        password=hash_password("default123"),
                        name=f"Parent of {s_data['name']}",
                        student_id=student.id,
                    )
                    session.add(parent)
                logger.info(f"Enrolled student {usn} and created parent shell")
        await session.commit()

    @staticmethod
    async def assign_subject_to_teacher(
        session: AsyncSession,
        teacher_username: str,
        subject_code: str,
        section_id: int,
        semester: str,
        batch_year: int,
    ):
        """Maps a teacher to a specific subject and section for a semester."""
        subject_code = subject_code.strip().upper()
        semester = semester.lower().strip()

        # Verify entities exist
        t_stmt = select(Teacher).where(Teacher.username == teacher_username)
        s_stmt = select(Subject).where(Subject.subject_code == subject_code)
        sec_stmt = select(Section).where(Section.id == section_id)

        if not (await session.execute(t_stmt)).scalar_one_or_none():
            raise ValueError(f"Teacher {teacher_username} not found")
        if not (await session.execute(s_stmt)).scalar_one_or_none():
            raise ValueError(f"Subject {subject_code} not found")
        if not (await session.execute(sec_stmt)).scalar_one_or_none():
            raise ValueError(f"Section ID {section_id} not found")

        # Create or update assignment
        stmt = select(SubjectAssignment).where(
            SubjectAssignment.teacher_username == teacher_username,
            SubjectAssignment.subject_code == subject_code,
            SubjectAssignment.section_id == section_id,
            SubjectAssignment.semester == semester,
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()

        if not existing:
            assignment = SubjectAssignment(
                teacher_username=teacher_username,
                subject_code=subject_code,
                section_id=section_id,
                semester=semester,
                batch_year=batch_year,
            )
            session.add(assignment)
            logger.info(
                f"Assigned {teacher_username} to {subject_code} in section {section_id}"
            )

        await session.commit()

    @staticmethod
    async def get_assignments_by_batch(session: AsyncSession, batch_year: int):
        """Retrieves all subject assignments for a given batch year, including subject, section, and teacher relationships."""
        from sqlalchemy.orm import selectinload
        stmt = (
            select(SubjectAssignment)
            .where(SubjectAssignment.batch_year == batch_year)
            .options(
                selectinload(SubjectAssignment.subject),
                selectinload(SubjectAssignment.section),
                selectinload(SubjectAssignment.teacher),
            )
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def delete_assignment(session: AsyncSession, assignment_id: int):
        """Deletes a subject assignment by its primary key ID."""
        stmt = select(SubjectAssignment).where(SubjectAssignment.id == assignment_id)
        result = await session.execute(stmt)
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise ValueError(f"Assignment with ID {assignment_id} not found")
        await session.delete(assignment)
        await session.commit()



# ============================================================
# Batch Lifecycle Service
# ============================================================


class BatchLifecycleService:
    """
    Manages the IN_SETUP → READY → ACTIVE → ARCHIVED state machine for each batch.
    Auto-promotes status based on entity counts.
    """

    @staticmethod
    async def get_or_create(db: AsyncSession, batch_year: int) -> BatchLifecycle:
        """Return the BatchLifecycle for a batch, creating it (IN_SETUP) if it doesn't exist."""
        stmt = select(BatchLifecycle).where(BatchLifecycle.batch_year == batch_year)
        lifecycle = (await db.execute(stmt)).scalar_one_or_none()
        if not lifecycle:
            lifecycle = BatchLifecycle(
                batch_year=batch_year,
                status=BatchStatus.IN_SETUP,
                section_count=0,
                subject_count=0,
                student_count=0,
                assignment_count=0,
            )
            db.add(lifecycle)
            await db.flush()
        return lifecycle

    @staticmethod
    async def refresh_counts_and_status(
        db: AsyncSession, batch_year: int
    ) -> BatchLifecycle:
        """
        Recalculate counts from the DB and auto-promote status:
          - Has sections                              → IN_SETUP
          - Has sections + students                  → IN_SETUP
          - Has sections + students + any assignments → READY
        ACTIVE and ARCHIVED are set manually via the update-batch-status endpoint.
        """
        lifecycle = await BatchLifecycleService.get_or_create(db, batch_year)

        # Count sections for this batch
        sec_count = (
            await db.execute(
                select(func.count()).where(Section.batch_year == batch_year)
            )
        ).scalar_one()

        # Count subjects (global — not batch-scoped)
        sub_count = (
            await db.execute(select(func.count()).select_from(Subject))
        ).scalar_one()

        # Count students for this batch
        stu_count = (
            await db.execute(
                select(func.count()).where(StudentAuth.batch_year == batch_year)
            )
        ).scalar_one()

        # Count assignments for this batch
        asgn_count = (
            await db.execute(
                select(func.count()).where(SubjectAssignment.batch_year == batch_year)
            )
        ).scalar_one()

        lifecycle.section_count = sec_count
        lifecycle.subject_count = sub_count
        lifecycle.student_count = stu_count
        lifecycle.assignment_count = asgn_count

        # Auto-promote only if currently in a mutable state
        if lifecycle.status in (BatchStatus.IN_SETUP, BatchStatus.READY):
            if sec_count > 0 and stu_count > 0 and asgn_count > 0:
                lifecycle.status = BatchStatus.READY
            else:
                lifecycle.status = BatchStatus.IN_SETUP

        await db.commit()
        await db.refresh(lifecycle)
        logger.info(
            f"Batch {batch_year} lifecycle refreshed: "
            f"status={lifecycle.status}, sections={sec_count}, "
            f"subjects={sub_count}, students={stu_count}, assignments={asgn_count}"
        )
        return lifecycle

    @staticmethod
    async def set_status(
        db: AsyncSession, batch_year: int, new_status: BatchStatus
    ) -> BatchLifecycle:
        """Manually set the batch status (for ACTIVE / ARCHIVED transitions)."""
        lifecycle = await BatchLifecycleService.get_or_create(db, batch_year)
        lifecycle.status = new_status
        await db.commit()
        await db.refresh(lifecycle)
        return lifecycle

    # ------------------------------------------------------------------
    # Dry-Run Validators
    # ------------------------------------------------------------------

    @staticmethod
    async def validate_students_excel(
        db: AsyncSession, batch_year: int, rows: List[Dict]
    ) -> Dict:
        """
        Stage 1 of two-phase commit for student enrollment.
        Returns a structured preview: { valid, duplicates, errors, total }
        """
        required_fields = {"usn", "name", "email", "phone"}
        valid: List[Dict] = []
        duplicates: List[Dict] = []
        errors: List[str] = []

        # Collect all USNs from the uploaded rows
        seen_usns_in_file: set = set()
        candidate_usns = [
            str(r.get("usn", "")).strip().upper()
            for r in rows
            if str(r.get("usn", "")).strip()
        ]

        # Fetch which USNs already exist in the DB for this batch
        if candidate_usns:
            existing_result = await db.execute(
                select(StudentAuth.usn).where(
                    StudentAuth.usn.in_(candidate_usns),
                    StudentAuth.batch_year == batch_year,
                )
            )
            existing_usns: set = {row[0] for row in existing_result.fetchall()}
        else:
            existing_usns = set()

        for i, row in enumerate(rows, start=2):  # start=2 for Excel row numbers
            usn = str(row.get("usn", "")).strip().upper()
            name = str(row.get("name", "")).strip()
            email = str(row.get("email", "")).strip()
            phone = str(row.get("phone", "")).strip()

            # Missing required fields
            missing = [f for f in required_fields if not row.get(f, "")]
            if missing:
                errors.append(f"Row {i}: Missing fields — {', '.join(missing)}")
                continue

            if not usn or usn == "NAN":
                errors.append(f"Row {i}: Invalid USN")
                continue

            # Duplicate in the file itself
            if usn in seen_usns_in_file:
                duplicates.append(
                    {"usn": usn, "name": name, "reason": "Duplicate in file"}
                )
                continue

            seen_usns_in_file.add(usn)

            # Already exists in DB for this batch (will be updated, not blocked)
            if usn in existing_usns:
                duplicates.append(
                    {
                        "usn": usn,
                        "name": name,
                        "reason": "Already enrolled — will update",
                    }
                )
            else:
                valid.append({"usn": usn, "name": name, "email": email, "phone": phone})

        return {
            "valid": valid,
            "duplicates": duplicates,
            "errors": errors,
            "total_in_file": len(rows),
            "will_insert": len(valid),
            "will_update": len([d for d in duplicates if "update" in d["reason"]]),
            "will_skip": len(
                [d for d in duplicates if "Duplicate in file" in d["reason"]]
            ),
        }

    @staticmethod
    def validate_subjects_excel(rows: List[Dict]) -> Dict:
        """
        Stage 1 of two-phase commit for subject registration.
        Returns a structured preview: { valid, errors }
        """
        valid: List[Dict] = []
        errors: List[str] = []
        seen_codes: set = set()

        for i, row in enumerate(rows, start=2):
            code = str(row.get("code", "")).strip().upper()
            name = str(row.get("name", "")).strip()
            credits_raw = row.get("credits", "")

            if not code or code == "NAN":
                errors.append(f"Row {i}: Missing subject code")
                continue

            if not name or name == "NAN":
                errors.append(f"Row {i}: Missing subject name (code: {code})")
                continue

            try:
                credits = int(credits_raw)
                if credits < 0 or credits > 10:
                    raise ValueError
            except (ValueError, TypeError):
                errors.append(
                    f"Row {i}: Invalid credits value '{credits_raw}' for {code}"
                )
                continue

            if code in seen_codes:
                errors.append(f"Row {i}: Duplicate subject code {code} in file")
                continue

            seen_codes.add(code)
            valid.append({"code": code, "name": name, "credits": credits})

        return {
            "valid": valid,
            "errors": errors,
            "total_in_file": len(rows),
            "will_upsert": len(valid),
        }
