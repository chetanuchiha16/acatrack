from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import AcademicResult, Subject, StudentAuth, Section

from typing import Union
from sqlalchemy.orm import Session


class UniversityRepository:
    def __init__(self, db_session: Union[AsyncSession, Session]):
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

    async def get_student_usns_by_semester(
        self, semester: str, batch_year: int, section_name: str = None
    ) -> list[str]:
        """Fetch all unique USNs for a given semester and batch, optionally filtered by section."""
        query = (
            select(StudentAuth.usn)
            .join(AcademicResult, AcademicResult.student_id == StudentAuth.id)
            .join(Subject, Subject.subject_code == AcademicResult.subject_code)
            .where(
                AcademicResult.batch_year == batch_year,
                Subject.semester == semester,
            )
        )

        if section_name and section_name != "ALL":
            query = query.join(Section, StudentAuth.section_id == Section.id).where(Section.name == section_name)

        query = query.distinct()
        result = await self.db.execute(query)
        return [row[0] for row in result.all()]

    def get_semesters_by_batch_sync(self, batch_year: int) -> list[str]:
        """Sync version — for use inside run_in_executor/legacy sync paths."""
        query = (
            select(Subject.semester)
            .join(AcademicResult, AcademicResult.subject_code == Subject.subject_code)
            .where(AcademicResult.batch_year == batch_year)
            .distinct()
        )
        result = self.db.execute(query)
        return [row[0] for row in result.all() if row[0]]

    def get_student_usns_by_semester_sync(
        self, semester: str, batch_year: int, section_name: str = None
    ) -> list[str]:
        """Sync version — for use inside run_in_executor/legacy sync paths."""
        query = (
            select(StudentAuth.usn)
            .join(AcademicResult, AcademicResult.student_id == StudentAuth.id)
            .join(Subject, Subject.subject_code == AcademicResult.subject_code)
            .where(
                AcademicResult.batch_year == batch_year,
                Subject.semester == semester,
            )
        )

        if section_name and section_name != "ALL":
            query = query.join(Section, StudentAuth.section_id == Section.id).where(Section.name == section_name)

        query = query.distinct()
        result = self.db.execute(query)
        return [row[0] for row in result.all()]
