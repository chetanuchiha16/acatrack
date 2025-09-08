from flask import Blueprint, request, jsonify, session
from models import Mentor, StudentAuth, MentorMessage, StudentMessageStatus

from email.utils import parseaddr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timezone
from models.batch_manager import BatchManager, bm
mentor_email_bp = Blueprint("mentor_email", __name__)




# ---------------- Email Helper ----------------
EMAIL_ADDRESS = os.getenv("EMAIL_USER", "abhishek.r0605@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS", "ithlbwrmeyajuenr")  # App password


def send_email(to_email, subject, body):
    if not to_email or "@" not in parseaddr(to_email)[1]:
        return False
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
        return True
    except Exception as e:
        print("Email send error:", e)
        return False


# ---------------- Save Message ----------------
def save_message(mentor_id, usn, recipient_type, subject, message, email_failed=False):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name}"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        msg = MentorMessage(
            mentor_id=mentor_id,
            student_usn=usn,
            recipient_type=recipient_type,
            subject=subject,
            message=message + sender_info,
            email_failed=email_failed,
        )
        db.session.add(msg)
        db.session.commit()
        return msg



def serialize_message_with_read_status(msg):
    students = []
    for s in msg.mentor.students:  # now directly StudentAuth objects
        status = StudentMessageStatus.query.filter_by(student_usn=s.username, msg_id=msg.id).first()
        students.append({
            "usn": s.username,
            "name": s.name,
            "read": status.read if status else False
        })
    return {**msg.to_dict(), "read_status": students}



# ---------------- Mentor APIs ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/students", methods=["GET"])
def get_mentor_students(mentor_id):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404
        students = []
        for s in mentor.students:  # direct students now
            students.append({
                "usn": s.username,
                "name": s.name,
                "parent_name": s.parent_account.name if s.parent_account else None,
                "parent_email": s.parent_account.email if s.parent_account else None,
                "parent_phone": s.parent_account.phone if s.parent_account else None
            })
    return jsonify({"students": students})



@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["GET"])
def get_messages(mentor_id):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        msgs = MentorMessage.query.filter_by(mentor_id=mentor_id).order_by(MentorMessage.id.desc()).all()
        return jsonify([serialize_message_with_read_status(m) for m in msgs])


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["POST"])
def create_message(mentor_id):
    """Store message only (no email send here)."""
    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = session.get("batch_year")
    

    if not subject or not message:
        return jsonify({"error": "Subject and message required"}), 400
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404

        msg = save_message(mentor_id, usn, recipient_type, subject, message)
        return jsonify(serialize_message_with_read_status(msg)), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/student", methods=["POST"])
def send_email_student(mentor_id):

    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        student = StudentAuth.query.filter_by(username=usn).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if recipient_type == "parent":
            to_email = getattr(student, "parent_email", None)
            name = getattr(student, "parent_name", None) or student.name
        else:
            to_email = getattr(student, "student_email", None)
            name = student.name

        mentor = Mentor.query.get(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        success = send_email(to_email, subject, f"Hello {name},\n\n{message}{sender_info}")


        return jsonify({"success": success}), (200 if success else 500)


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/all", methods=["POST"])
def send_email_all(mentor_id):
    data = request.get_json() or {}
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404

        results = []
        for s in mentor.students:  # direct now
            if recipient_type == "parent":
                to_email = getattr(s.parent_account, "email", None)
                name = getattr(s.parent_account, "name", None) or s.name
            else:
                to_email = getattr(s, "student_email", None)
                name = s.name


            mentor = Mentor.query.get(mentor_id)
            sender_info = f"\n\n--\nMessage sent by {mentor.name}"
            if hasattr(mentor, "email"):
                sender_info += f"\nEmail: {mentor.email}"
            if hasattr(mentor, "phone"):
                sender_info += f"\nPhone: {mentor.phone}"

            success = send_email(to_email, subject, f"Hello {name},\n\n{message}{sender_info}")

            results.append({"usn": s.username, "success": success})

        return jsonify(results), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(mentor_id, msg_id):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        msg = MentorMessage.query.filter_by(id=msg_id, mentor_id=mentor_id).first()
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        # Delete related student statuses manually
        StudentMessageStatus.query.filter_by(msg_id=msg_id).delete()

        # Delete the message itself
        db.session.delete(msg)
        db.session.commit()
        return jsonify({"success": True})
