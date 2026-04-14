"""
Email-related routes — migrated to FastAPI.
"""
import smtplib
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from logger_config import get_logger
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request
from models.schema import Message
from repositories.student_repository import StudentRepository
from settings import settings
from sqlalchemy import select
from validators.email_validators import (
    SaveMessageRequest,
    SendAllEmailRequest,
    SendStudentEmailRequest,
)

logger = get_logger(__name__)

router = APIRouter(tags=["email"])

EMAIL_ADDRESS = settings.a_email
EMAIL_PASSWORD = settings.email_pass

_email_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="email_worker")


def _send_smtp(to_email: str, subject: str, body: str) -> bool:
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP error sending to {to_email}: {e}")
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    return _send_smtp(to_email, subject, body)


def send_email_async(to_email: str, subject: str, body: str) -> None:
    _email_executor.submit(_send_smtp, to_email, subject, body)


@router.post("/send-email/all", status_code=202)
async def send_email_to_all(body: SendAllEmailRequest, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)

        if body.recipientType == "parent":
            recipients = await student_repo.get_all_with_parent_email()
            email_attr = "parent_email"
            name_attr = "parent_name"
        else:
            recipients = await student_repo.get_all()
            email_attr = "student_email"
            name_attr = "name"

        payloads = []
        for person in recipients:
            to_email = getattr(person, email_attr, None)
            if not to_email:
                continue
            name = getattr(person, name_attr, None) or getattr(person, "name", "Student")
            payloads.append((to_email, name))

    for to_email, name in payloads:
        personalized_body = f"Hello {name},\n\n{body.message}"
        send_email_async(to_email, body.subject, personalized_body)

    return {
        "message": f"Queued emails to {len(payloads)} {body.recipientType}(s)",
        "queued": len(payloads),
    }


@router.post("/send-email/student", status_code=202)
async def send_email_to_student(body: SendStudentEmailRequest, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        student = await student_repo.get_auth_by_usn(body.usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        if body.recipientType == "parent":
            to_email = getattr(student, "parent_email", None)
            name = getattr(student, "parent_name", None) or student.name
            if not to_email:
                return JSONResponse(
                    content={"error": "Parent email not found for this student"},
                    status_code=404,
                )
        else:
            to_email = student.student_email
            name = student.name

    personalized_body = f"Hello {name},\n\n{body.message}"
    send_email_async(to_email, body.subject, personalized_body)

    return {"message": f"Email queued for {body.recipientType} with USN {body.usn}"}


@router.post("/messages", status_code=201)
async def save_message(body: SaveMessageRequest, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        new_msg = Message(
            usn=body.usn,
            recipient_type=body.recipientType,
            subject=body.subject,
            message=body.message,
        )
        session.add(new_msg)
        await session.commit()
        await session.refresh(new_msg)
        return new_msg.to_dict()


@router.get("/messages")
async def get_messages(request: Request):
    batch_year = get_batch_year_from_request(request)
    logger.debug(f"{batch_year} from get_messages")
    async with bm.session_scope(batch_year) as session:
        result = await session.execute(
            select(Message).order_by(Message.created_at.desc())
        )
        messages = result.scalars().all()
        return [m.to_dict() for m in messages]


@router.delete("/messages/{msg_id}")
async def delete_message(msg_id: int, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        msg = await session.get(Message, msg_id)
        if not msg:
            return JSONResponse(content={"error": "Message not found"}, status_code=404)
        await session.delete(msg)
        await session.commit()
        return {"message": "Message deleted"}
