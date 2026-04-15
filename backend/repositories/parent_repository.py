# backend/repositories/parent_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.schema import ParentAuth, StudentAuth


class ParentRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_auth_by_username(self, username: str) -> ParentAuth | None:
        result = await self.db.execute(
            select(ParentAuth)
            .options(selectinload(ParentAuth.student).selectinload(StudentAuth.mentor))
            .where(ParentAuth.username == username)
        )
        return result.scalars().first()
