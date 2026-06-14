from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import Message


class MessageRepository:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db = db_session

    async def create_message(
        self, usn: str, recipient_type: str, subject: str, message: str
    ) -> Message:
        new_msg = Message(
            usn=usn,
            recipient_type=recipient_type,
            subject=subject,
            message=message,
        )
        self.db.add(new_msg)
        return new_msg

    async def get_all_by_newest(self) -> list[Message]:
        result = await self.db.execute(
            select(Message).order_by(Message.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, msg_id: int) -> Message | None:
        return await self.db.get(Message, msg_id)

    async def delete_message(self, msg: Message) -> None:
        await self.db.delete(msg)
