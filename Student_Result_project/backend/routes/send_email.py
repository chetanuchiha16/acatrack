"""
Email-related routes.

Key improvements:
- Pydantic validation on all request bodies (raises 422 on bad input)
- Non-blocking email: SMTP calls run in background threads so the route
  returns immediately instead of waiting 2-5s for SMTP roundtrip
- Message model lives in models/schema.py, not here
"""

import smtplib
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import Blueprint, jsonify, request
from logger_config import get_logger
from services.batch_manager import bm
from utils.helpers import get_batch_year
from models.schema import Message
from repositories.student_repository import StudentRepository
from settings import settings
from validators.email_validators import (
    SaveMessageRequest,
    SendAllEmailRequest,
    SendStudentEmailRequest,
)

logger = get_logger(__name__)

email_bp = Blueprint("email", __name__)

EMAIL_ADDRESS = settings.a_email
EMAIL_PASSWORD = settings.email_pass

# Thread pool for fire-and-forget email sending (max 5 concurrent SMTP connections)
_email_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="email_worker")


# -----------------------------
# Email Sending Utility
# -----------------------------
def _send_smtp(to_email: str, subject: str, body: str) -> bool:
    """Blocking SMTP call — always run this inside the executor, never on the main thread."""
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
    """
    Synchronous wrapper kept for caller compatibility (mentor_send_email, etc.).
    Runs the SMTP call on the current thread — only use from routes that
    already handle async themselves (e.g. mentor_send_email).
    """
    return _send_smtp(to_email, subject, body)


def send_email_async(to_email: str, subject: str, body: str) -> None:
    """
    Fire-and-forget: submits SMTP call to the thread pool and returns immediately.
    The route does NOT wait for the email to be sent.
    """
    _email_executor.submit(_send_smtp, to_email, subject, body)


# -----------------------------
# Email Endpoints
# -----------------------------
@email_bp.route("/send-email/all", methods=["POST"])
def send_email_to_all():
    # Pydantic validation — raises ValidationError (→ 422) on bad input
    body = SendAllEmailRequest.model_validate(request.get_json() or {})

    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)

        if body.recipientType == "parent":
            recipients = student_repo.get_all_with_parent_email()
            email_attr = "parent_email"
            name_attr = "parent_name"
        else:
            recipients = student_repo.get_all()
            email_attr = "student_email"
            name_attr = "name"

        # Snapshot data before session closes — avoid DetachedInstanceError
        payloads = []
        for person in recipients:
            to_email = getattr(person, email_attr, None)
            if not to_email:
                continue
            name = getattr(person, name_attr, None) or getattr(person, "name", "Student")
            payloads.append((to_email, name))

    # Fire emails asynchronously — session is already closed, data is snaphotted
    for to_email, name in payloads:
        personalized_body = f"Hello {name},\n\n{body.message}"
        send_email_async(to_email, body.subject, personalized_body)

    return jsonify({
        "message": f"Queued emails to {len(payloads)} {body.recipientType}(s)",
        "queued": len(payloads),
    }), 202  # 202 Accepted = request received, work is in progress


@email_bp.route("/send-email/student", methods=["POST"])
def send_email_to_student():
    body = SendStudentEmailRequest.model_validate(request.get_json() or {})

    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        student = student_repo.get_auth_by_usn(body.usn)
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if body.recipientType == "parent":
            to_email = getattr(student, "parent_email", None)
            name = getattr(student, "parent_name", None) or student.name
            if not to_email:
                return jsonify({"error": "Parent email not found for this student"}), 404
        else:
            to_email = student.student_email
            name = student.name

    # Fire email asynchronously; session already closed
    personalized_body = f"Hello {name},\n\n{body.message}"
    send_email_async(to_email, body.subject, personalized_body)

    return jsonify({
        "message": f"Email queued for {body.recipientType} with USN {body.usn}"
    }), 202


# -----------------------------
# Message CRUD Endpoints
# -----------------------------
@email_bp.route("/messages", methods=["POST"])
def save_message():
    body = SaveMessageRequest.model_validate(request.get_json() or {})
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        new_msg = Message(
            usn=body.usn,
            recipient_type=body.recipientType,
            subject=body.subject,
            message=body.message,
        )
        db.session.add(new_msg)
        db.session.commit()
        return jsonify(new_msg.to_dict()), 201


@email_bp.route("/messages", methods=["GET"])
def get_messages():
    batch_year = get_batch_year()
    logger.debug(f"{batch_year} from get_messages")
    with bm.session_scope(batch_year) as db:
        messages = db.session.query(Message).order_by(Message.created_at.desc()).all()
        return jsonify([m.to_dict() for m in messages]), 200


@email_bp.route("/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(msg_id):
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        msg = db.session.query(Message).get(msg_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404
        db.session.delete(msg)
        db.session.commit()
        return jsonify({"message": "Message deleted"}), 200
