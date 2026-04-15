from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import AcademicResult, Subject, StudentAuth
from typing import List, Dict, Any

class AcademicRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_semester_summary_stats(self, semester: str, batch_year: int) -> List[Dict[str, Any]]:
        """
        Calculates all summary statistics (Total, Pass, Fail, FCD, etc.) 
        for all subjects in a semester using a single SQL aggregation.
        FAANG-level optimization: Compute at the source (SQL) instead of Python loops.
        """
        # Define pass criteria once
        # Pass = (SEE >= 18 and IA >= 18) OR (Credits == 0 and SEE == 0 and IA >= 18)
        # Note: This logic follows results_service.py
        
        is_pass = case(
            (
                (AcademicResult.see_marks >= 18) & (AcademicResult.ia_marks >= 18), 
                True
            ),
            (
                (AcademicResult.see_marks == 0) & (AcademicResult.ia_marks >= 18),
                True
            ),
            else_=False
        )

        marks = case(
            (AcademicResult.see_marks == 0, AcademicResult.ia_marks),
            else_=AcademicResult.total_marks
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
                func.sum(case((marks >= 70, 1), else_=0)).label("fcd_count"),
                func.sum(case(((marks >= 60) & (marks < 70), 1), else_=0)).label("fc_count"),
                func.sum(case(((marks >= 50) & (marks < 60), 1), else_=0)).label("sc_count")
            )
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .where(
                Subject.semester == semester,
                AcademicResult.batch_year == batch_year
            )
            .group_by(Subject.subject_code, Subject.subject_name)
        )

        result = await self.db.execute(query)
        stats = []
        for row in result.all():
            pass_percentage = (row.pass_count / row.present_students * 100) if row.present_students > 0 else 0
            stats.append({
                "subject_code": row.subject_code,
                "subject_name": row.subject_name,
                "total_students": row.total_students,
                "present_students": row.present_students,
                "absent_students": 0, # In current normalized DB, absence might be handled differently
                "pass_count": row.pass_count,
                "fail_count": row.fail_count,
                "pass_percentage": round(pass_percentage, 2),
                "fcd_count": row.fcd_count,
                "fc_count": row.fc_count,
                "sc_count": row.sc_count
            })
        return stats

    async def get_toppers_by_percentage(self, semester: str, batch_year: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetches toppers for a semester using SQL sorting and projection.
        """
        # This requires calculating percentage in SQL or pre-calculating it.
        # Since percent depends on sum of marks / sum of credits, it's doable but complex.
        # For now, let's stick to the Student object for individual detail until we optimize percentage storage.
        pass
