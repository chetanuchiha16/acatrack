# backend/repositories/parent_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import ParentAuth


class ParentRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_auth_by_username(self, username: str) -> ParentAuth | None:
        result = await self.db.execute(
            select(ParentAuth).where(ParentAuth.username == username)
        )
        return result.scalars().first()
