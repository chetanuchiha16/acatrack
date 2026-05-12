from firebase_admin import messaging
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from models import Mentor, MentorMessage, StudentMessageStatus
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request
from repositories.mentor_repository import MentorRepository
from repositories.student_repository import StudentRepository
from routes.send_email import send_email_async
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from cache_config import cache
from validators.email_validators import SaveMessageRequest, SendStudentEmailRequest
from schemas import (
    MentorMenteeListResponse,
    MentorMessageResponse,
    EmailAllStatus,
    MentorSendEmailAllRequest,
)
from typing import List

router = APIRouter(tags=["mentor_email"])


async def save_message(
    session, mentor_id, usn, recipient_type, subject, message, email_failed=False
):
    mentor_repo = MentorRepository(session)
    student_repo = StudentRepository(session)

    mentor = await mentor_repo.get_by_id(mentor_id)
    sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
    if hasattr(mentor, "email"):
        sender_info += f"\nEmail: {mentor.email}"
    if hasattr(mentor, "phone"):
        sender_info += f"\nPhone: {mentor.phone}"

    student = await student_repo.get_auth_by_usn(usn) if usn else None

    msg = MentorMessage(
        mentor_id=mentor_id,
        student_id=student.id if student else None,
        recipient_type=recipient_type,
        subject=subject,
        message=message + sender_info,
        email_failed=email_failed,
    )
    session.add(msg)
    await session.commit()

    # Re-fetch with eager loading
    result = await session.execute(
        select(MentorMessage)
        .options(
            selectinload(MentorMessage.student),
            selectinload(MentorMessage.mentor).selectinload(Mentor.students),
        )
        .where(MentorMessage.id == msg.id)
    )
    return result.scalars().first()


async def serialize_message_with_read_status(session, msg, batch_year=None):
    students = []
    valid_students = []
    if msg.mentor and hasattr(msg.mentor, "students"):
        for s in msg.mentor.students:
            if batch_year and str(s.batch_year) != str(batch_year):
                continue
            valid_students.append(s)

    if not valid_students:
        return {**msg.to_dict(), "read_status": []}

    student_ids = [s.id for s in valid_students]
    result = await session.execute(
        select(StudentMessageStatus).where(
            StudentMessageStatus.msg_id == msg.id,
            StudentMessageStatus.student_id.in_(student_ids),
        )
    )
    statuses = result.scalars().all()
    status_map = {st.student_id: st.read for st in statuses}

    for s in valid_students:
        students.append(
            {"usn": s.usn, "name": s.name, "read": status_map.get(s.id, False)}
        )

    return {**msg.to_dict(), "read_status": students}


@router.delete("/mentor/{mentor_id}/messages/{msg_id}")
async def delete_message(
    mentor_id: int, msg_id: int, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        msg = await mentor_repo.get_message_by_id(msg_id)

        if not msg:
            return JSONResponse(content={"error": "Message not found"}, status_code=404)
        if msg.mentor_id != mentor_id:
            return JSONResponse(content={"error": "Unauthorized"}, status_code=403)

        await mentor_repo.delete_message_statuses(msg_id)
        await session.delete(msg)
        await session.commit()

    return {"success": True}


@router.get("/mentor/{mentor_id}/students", response_model=MentorMenteeListResponse)
@cache(expire=3600)
async def get_mentor_students(
    mentor_id: int, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        mentor = await mentor_repo.get_by_id(mentor_id)
        if not mentor:
            return JSONResponse(content={"error": "Mentor not found"}, status_code=404)

        student_repo = StudentRepository(session)
        students_list = await student_repo.get_mentees_by_mentor(mentor_id)

        students = []
        for s in students_list:
            if str(s.batch_year) != str(by):
                continue
            students.append(
                {
                    "usn": s.usn,
                    "name": s.name,
                    "parent_name": s.parent_account.name
                    if hasattr(s, "parent_account") and s.parent_account
                    else None,
                    "parent_email": s.parent_account.email
                    if hasattr(s, "parent_account") and s.parent_account
                    else None,
                    "parent_phone": s.parent_account.phone
                    if hasattr(s, "parent_account") and s.parent_account
                    else None,
                }
            )
    return {"students": students}


@router.get("/mentor/{mentor_id}/messages", response_model=List[MentorMessageResponse])
async def get_messages(
    mentor_id: int, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        msgs = await mentor_repo.get_messages_by_mentor(mentor_id)
        return [await serialize_message_with_read_status(session, m, by) for m in msgs]


@router.post("/mentor/{mentor_id}/messages", response_model=MentorMessageResponse)
async def send_mentor_message(
    mentor_id: int,
    body: SaveMessageRequest,
    request: Request,
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        msg = await save_message(
            session, mentor_id, body.usn, body.recipientType, body.subject, body.message
        )
        result = await serialize_message_with_read_status(session, msg, by)
    return result


@router.post("/mentor/{mentor_id}/send-email/student")
async def send_email_student(
    mentor_id: int,
    body: SendStudentEmailRequest,
    request: Request,
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        student_repo = StudentRepository(session)
        mentor_repo = MentorRepository(session)

        student = await student_repo.get_auth_by_usn(body.usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        if body.recipientType == "parent":
            to_email = getattr(student, "parent_email", None)
            name = getattr(student, "parent_name", None) or student.name
        else:
            to_email = getattr(student, "student_email", None)
            name = student.name

        mentor = await mentor_repo.get_by_id(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        full_message = f"Hello {name},\n\n{body.message}{sender_info}"

        msg_obj = await save_message(
            session, mentor_id, body.usn, body.recipientType, body.subject, body.message
        )

        if to_email:
            send_email_async(to_email, body.subject, full_message)
        else:
            msg_obj.email_failed = True
            await session.commit()

        fcm_token = getattr(student, "fcm_token", None)
        if fcm_token:
            try:
                notification = messaging.Notification(
                    title=f"New message from Mentor: {body.subject}", body=body.message
                )
                fb_msg = messaging.Message(notification=notification, token=fcm_token)
                messaging.send(fb_msg)
            except Exception:
                pass

    return {"success": True}


@router.post("/mentor/{mentor_id}/send-email/all", response_model=List[EmailAllStatus])
async def send_email_all(
    mentor_id: int,
    body: MentorSendEmailAllRequest,
    request: Request,
    batch_year: int | None = Query(None),
):
    recipient_type = body.recipientType.lower()
    subject = body.subject
    message = body.message
    by = batch_year or get_batch_year_from_request(request)

    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        mentor = await mentor_repo.get_by_id(mentor_id)
        if not mentor:
            return JSONResponse(content={"error": "Mentor not found"}, status_code=404)

        student_repo = StudentRepository(session)
        all_students = await student_repo.get_mentees_by_mentor(mentor_id)

        results = []
        for s in all_students:
            if str(s.batch_year) != str(by):
                continue

            if recipient_type == "parent":
                to_email = (
                    getattr(s.parent_account, "email", None)
                    if s.parent_account
                    else None
                )
                name = (
                    getattr(s.parent_account, "name", None)
                    if s.parent_account
                    else s.name
                )
            else:
                to_email = getattr(s, "student_email", None)
                name = s.name

            sender_info = f"\n\n--\nMessage sent by {mentor.name}"
            if hasattr(mentor, "email"):
                sender_info += f"\nEmail: {mentor.email}"
            if hasattr(mentor, "phone"):
                sender_info += f"\nPhone: {mentor.phone}"

            if to_email:
                send_email_async(
                    to_email, subject, f"Hello {name},\n\n{message}{sender_info}"
                )
                success = True
            else:
                success = False

            results.append({"usn": s.usn, "success": success})

        return results
