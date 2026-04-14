# backend/repositories/admin_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import ExportCache


class AdminRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_export_cache_by_batch(self, batch_year: int) -> ExportCache | None:
        result = await self.db.execute(
            select(ExportCache).where(ExportCache.batch_year == batch_year)
        )
        return result.scalars().first()
