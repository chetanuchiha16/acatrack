from datetime import timezone
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from services.batch_manager import bm
from models.schema import MentorMessage, StudentMessageStatus
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from utils.helpers import get_batch_year_from_request
from sqlalchemy import select

router = APIRouter(tags=["student_email"])


def serialize_message(msg, student, status=None, mentor=None):
    dt = msg.created_at
    if dt and dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return {
        "id": msg.id,
        "subject": getattr(msg, "subject", None),
        "message": getattr(msg, "message", None),
        "mentor_name": mentor.name if mentor else None,
        "read": status.read if status else False,
        "created_at": dt.isoformat() if dt else None,
    }


@router.get("/student/{usn}/messages")
async def get_student_messages(usn: str, request: Request):
    batch_year = get_batch_year_from_request(request)

    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        mentor_repo = MentorRepository(session)

        student = await student_repo.get_auth_by_usn(usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        result = await session.execute(
            select(MentorMessage)
            .where(
                (MentorMessage.student_id == student.id)
                | (MentorMessage.student_id.is_(None))
            )
            .order_by(MentorMessage.id.desc())
        )
        msgs = result.scalars().all()

        if not msgs:
            return []

        msg_ids = [m.id for m in msgs]
        mentor_ids = list(set(m.mentor_id for m in msgs if m.mentor_id is not None))

        status_result = await session.execute(
            select(StudentMessageStatus).where(
                StudentMessageStatus.student_id == student.id,
                StudentMessageStatus.msg_id.in_(msg_ids),
            )
        )
        statuses = status_result.scalars().all()
        status_map = {s.msg_id: s for s in statuses}

        mentors = await mentor_repo.get_mentors_by_ids(mentor_ids) if mentor_ids else []
        mentor_map = {m.id: m for m in mentors}

        results = []
        for m in msgs:
            status = status_map.get(m.id)
            mentor = mentor_map.get(m.mentor_id)
            results.append(serialize_message(m, student, status, mentor))
        return results


@router.get("/student/{usn}/messages/{msg_id}")
async def get_student_message_detail(usn: str, msg_id: int, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        mentor_repo = MentorRepository(session)

        student = await student_repo.get_auth_by_usn(usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        msg = await mentor_repo.get_message_by_id(msg_id)
        if not msg:
            return JSONResponse(content={"error": "Message not found"}, status_code=404)

        if msg.student_id not in (None, student.id):
            return JSONResponse(
                content={"error": "Not authorized to view this message"},
                status_code=403,
            )

        mentor = await mentor_repo.get_by_id(msg.mentor_id) if msg.mentor_id else None
        status_result = await session.execute(
            select(StudentMessageStatus).where(
                StudentMessageStatus.student_id == student.id,
                StudentMessageStatus.msg_id == msg_id,
            )
        )
        status = status_result.scalars().first()

        return serialize_message(msg, student, status, mentor)


@router.post("/student/{usn}/messages/{msg_id}/read")
async def mark_message_read(usn: str, msg_id: int, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        mentor_repo = MentorRepository(session)

        student = await student_repo.get_auth_by_usn(usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        msg = await mentor_repo.get_message_by_id(msg_id)
        if not msg:
            return JSONResponse(content={"error": "Message not found"}, status_code=404)

        if msg.student_id not in (None, student.id):
            return JSONResponse(
                content={"error": "Not authorized to update this message"},
                status_code=403,
            )

        status_result = await session.execute(
            select(StudentMessageStatus).where(
                StudentMessageStatus.student_id == student.id,
                StudentMessageStatus.msg_id == msg_id,
            )
        )
        status = status_result.scalars().first()

        if not status:
            status = StudentMessageStatus(
                student_id=student.id, msg_id=msg_id, read=True
            )
            session.add(status)
        else:
            status.read = True

        await session.commit()
        return {"message": f"Message {msg_id} marked as read by {usn}"}
