# backend/repositories/mentor_repository.py
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import Mentor, Teacher, Meeting, MentorMessage, StudentMessageStatus


class MentorRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    # --- Mentors ---
    async def get_by_id(self, mentor_id: int) -> Mentor | None:
        return await self.db.get(Mentor, mentor_id)

    async def get_by_name(self, name: str) -> Mentor | None:
        result = await self.db.execute(select(Mentor).where(Mentor.name == name))
        return result.scalars().first()

    async def get_all_by_names(self, names: list) -> list[Mentor]:
        result = await self.db.execute(select(Mentor).where(Mentor.name.in_(names)))
        return list(result.scalars().all())

    async def get_mentors_by_names_filter(self, names: list) -> list[Mentor]:
        """Alias for semantic clarity used in bulk upload routes."""
        return await self.get_all_by_names(names)

    async def get_all(self) -> list[Mentor]:
        result = await self.db.execute(select(Mentor))
        return list(result.scalars().all())

    async def get_all_mentors(self) -> list[Mentor]:
        """Alias for get_all for semantic clarity."""
        return await self.get_all()

    async def get_mentors_by_ids(self, ids: list) -> list[Mentor]:
        result = await self.db.execute(select(Mentor).where(Mentor.id.in_(ids)))
        return list(result.scalars().all())

    # --- Teachers ---
    async def get_teacher_by_username(self, username: str) -> Teacher | None:
        result = await self.db.execute(
            select(Teacher).where(Teacher.username == username)
        )
        return result.scalars().first()

    async def teacher_username_exists(self, username: str) -> bool:
        """Lightweight check used during unique-username generation."""
        result = await self.db.execute(
            select(Teacher.username).where(Teacher.username == username)
        )
        return result.scalars().first() is not None

    async def get_teacher_by_mentor_id(self, mentor_id: int) -> Teacher | None:
        result = await self.db.execute(
            select(Teacher).where(Teacher.mentor_id == mentor_id)
        )
        return result.scalars().first()

    async def get_teachers_by_names(self, names: list) -> list[Teacher]:
        result = await self.db.execute(
            select(Teacher).where(Teacher.name.in_(names))
        )
        return list(result.scalars().all())

    # --- Meetings ---
    async def get_meetings_by_mentor(self, mentor_id: int) -> list[Meeting]:
        result = await self.db.execute(
            select(Meeting)
            .where(Meeting.mentor_id == mentor_id)
            .order_by(Meeting.date)
        )
        return list(result.scalars().all())

    async def get_meeting_by_id(self, meeting_id: int) -> Meeting | None:
        return await self.db.get(Meeting, meeting_id)

    # --- Messages ---
    async def get_messages_by_mentor(self, mentor_id: int) -> list[MentorMessage]:
        result = await self.db.execute(
            select(MentorMessage)
            .where(MentorMessage.mentor_id == mentor_id)
            .order_by(MentorMessage.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_message_by_id_and_mentor(
        self, msg_id: int, mentor_id: int
    ) -> MentorMessage | None:
        result = await self.db.execute(
            select(MentorMessage).where(
                MentorMessage.id == msg_id,
                MentorMessage.mentor_id == mentor_id,
            )
        )
        return result.scalars().first()

    async def get_all_messages(self) -> list[MentorMessage]:
        result = await self.db.execute(select(MentorMessage))
        return list(result.scalars().all())

    async def delete_message_statuses(self, msg_id: int):
        await self.db.execute(
            delete(StudentMessageStatus).where(StudentMessageStatus.msg_id == msg_id)
        )

    async def get_message_by_id(self, msg_id: int) -> MentorMessage | None:
        result = await self.db.execute(
            select(MentorMessage).where(MentorMessage.id == msg_id)
        )
        return result.scalars().first()
