from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from models.schema import AcademicResult, ParentAuth, StudentAuth, Subject


class StudentRepository:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db = db_session

    async def get_auth_by_usn(self, usn: str) -> StudentAuth | None:
        result = await self.db.execute(
            select(StudentAuth).where(StudentAuth.usn == usn)
        )
        return result.scalars().first()

    async def get_auths_by_usns(self, usns: list[str]) -> list[StudentAuth]:
        result = await self.db.execute(
            select(StudentAuth).where(StudentAuth.usn.in_(usns))
        )
        return list(result.scalars().all())

    async def get_auths_with_parents_by_usns(self, usns: list[str]) -> list[StudentAuth]:
        result = await self.db.execute(
            select(StudentAuth)
            .options(selectinload(StudentAuth.parent_account))
            .where(StudentAuth.usn.in_(usns))
        )
        return list(result.scalars().all())

    async def get_mentees_by_mentor_and_batch(
        self, mentor_id: int, batch_year: int
    ) -> list[StudentAuth]:
        result = await self.db.execute(
            select(StudentAuth).where(
                StudentAuth.mentor_id == mentor_id,
                StudentAuth.batch_year == batch_year,
            )
        )
        return list(result.scalars().all())

    async def get_mentees_by_mentor(self, mentor_id: int) -> list[StudentAuth]:
        result = await self.db.execute(
            select(StudentAuth).where(StudentAuth.mentor_id == mentor_id)
        )
        return list(result.scalars().all())

    async def count_by_batch(self, batch_year: int) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(StudentAuth).where(
                StudentAuth.batch_year == batch_year
            )
        )
        return result.scalar() or 0

    async def get_all(self) -> list[StudentAuth]:
        result = await self.db.execute(select(StudentAuth))
        return list(result.scalars().all())

    async def get_all_with_parent_email(self) -> list[StudentAuth]:
        """Returns all students that have a linked parent account with an email."""
        result = await self.db.execute(
            select(StudentAuth)
            .join(ParentAuth, ParentAuth.student_id == StudentAuth.id)
            .where(ParentAuth.email.isnot(None))
        )
        return list(result.scalars().all())

    async def get_distinct_batch_years(self) -> list[int]:
        from sqlalchemy import distinct
        result = await self.db.execute(
            select(distinct(StudentAuth.batch_year))
        )
        return [row[0] for row in result.all()]

    async def get_auths_by_batch(self, batch_year: int) -> list[StudentAuth]:
        result = await self.db.execute(
            select(StudentAuth).where(StudentAuth.batch_year == batch_year)
        )
        return list(result.scalars().all())

    async def get_auths_with_parents_by_batch(self, batch_year: int) -> list[StudentAuth]:
        """Bulk-fetch all students for a batch with their parent accounts eagerly loaded."""
        result = await self.db.execute(
            select(StudentAuth)
            .options(selectinload(StudentAuth.parent_account))
            .where(StudentAuth.batch_year == batch_year)
        )
        return list(result.scalars().all())

    async def get_auth_by_batch(self, batch_year: int) -> list[StudentAuth]:
        """Alias for get_auths_by_batch."""
        return await self.get_auths_by_batch(batch_year)

    # --- Academic Results & Subjects ---
    async def get_results_by_usn(self, usn: str) -> list[tuple[AcademicResult, Subject]]:
        result = await self.db.execute(
            select(AcademicResult, Subject)
            .join(Subject)
            .join(StudentAuth)
            .where(StudentAuth.usn == usn)
        )
        return list(result.all())

    async def get_results_in_usns(
        self, usns: list[str]
    ) -> list[tuple[AcademicResult, Subject]]:
        result = await self.db.execute(
            select(AcademicResult, Subject)
            .join(Subject)
            .join(StudentAuth)
            .where(StudentAuth.usn.in_(usns))
        )
        return list(result.all())

    async def get_results_by_usns_and_sem(
        self, usns: list[str], semesters: list[str]
    ) -> list[tuple[AcademicResult, Subject]]:
        result = await self.db.execute(
            select(AcademicResult, Subject)
            .join(Subject)
            .join(StudentAuth)
            .where(StudentAuth.usn.in_(usns), Subject.semester.in_(semesters))
        )
        return list(result.all())

    async def get_results_by_usn_and_sem(
        self, usn: str, semester: str
    ) -> list[tuple[AcademicResult, Subject]]:
        result = await self.db.execute(
            select(AcademicResult, Subject)
            .join(Subject)
            .join(StudentAuth)
            .where(StudentAuth.usn == usn, Subject.semester == semester)
        )
        return list(result.all())

    async def count_results_by_batch(self, batch_year: int) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(AcademicResult).where(
                AcademicResult.batch_year == batch_year
            )
        )
        return result.scalar() or 0

    async def get_subjects_by_codes(self, subject_codes: list[str]) -> list[Subject]:
        result = await self.db.execute(
            select(Subject).where(Subject.subject_code.in_(subject_codes))
        )
        return list(result.scalars().all())

    async def count_subjects(self) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(Subject)
        )
        return result.scalar() or 0

    async def get_distinct_semesters_by_branch(self, branch: str) -> list:
        from sqlalchemy import distinct
        result = await self.db.execute(
            select(distinct(Subject.semester)).where(Subject.branch == branch)
        )
        return [row[0] for row in result.all()]
