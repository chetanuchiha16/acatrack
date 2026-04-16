from sqlalchemy import select, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import AcademicResult, Subject, StudentAuth

class UniversityRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_semesters_by_batch(self, batch_year: int) -> list[str]:
        """Fetch all unique semesters for a given batch."""
        query = (
            select(Subject.semester)
            .join(AcademicResult, AcademicResult.subject_code == Subject.subject_code)
            .where(AcademicResult.batch_year == batch_year)
            .distinct()
        )
        result = await self.db.execute(query)
        return [row[0] for row in result.all() if row[0]]

    async def get_student_usns_by_semester(self, semester: str, batch_year: int) -> list[str]:
        """Fetch all unique USNs for a given semester and batch."""
        query = (
            select(StudentAuth.usn)
            .join(AcademicResult, AcademicResult.student_id == StudentAuth.id)
            .join(Subject, Subject.subject_code == AcademicResult.subject_code)
            .where(
                AcademicResult.batch_year == batch_year,
                Subject.semester == semester,
            )
            .distinct()
        )
        result = await self.db.execute(query)
        return [row[0] for row in result.all()]
