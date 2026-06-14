from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import Job


class JobRepository:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db = db_session

    async def get_by_id(self, job_id: str) -> Job | None:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        return result.scalars().first()

    async def create_job(
        self, job_id: str, status: str = "queued", progress: int = 0
    ) -> Job:
        job = Job(id=job_id, status=status, progress=progress)
        self.db.add(job)
        return job
