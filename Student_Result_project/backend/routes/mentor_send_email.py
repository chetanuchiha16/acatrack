from flask import Blueprint, request, jsonify, session
from models import Mentor, StudentAuth, MentorMessage, StudentMessageStatus
from sqlalchemy.orm import joinedload
from email.utils import parseaddr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timezone
from models.batch_manager import BatchManager, bm
from firebase_admin import messaging
from models.helpers import get_batch_year
mentor_email_bp = Blueprint("mentor_email", __name__)




# ---------------- Email Helper ----------------
EMAIL_ADDRESS = os.getenv("A_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS")  # App password


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
        logger.debug("Email send error:", e)
        return False


# ---------------- Save Message ----------------
# ---------------- Save Message ----------------
def save_message(mentor_id, usn, recipient_type, subject, message, email_failed=False):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name}"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        # Lookup student to get ID
        student = StudentAuth.query.filter_by(usn=usn).first() if usn else None

        # 1️⃣ Create and save the message
        msg = MentorMessage(
            mentor_id=mentor_id,
            student_id=student.id if student else None,
            recipient_type=recipient_type,
            subject=subject,
            message=message + sender_info,
            email_failed=email_failed,
        )
        db.session.add(msg)
        db.session.commit()

        # 2️⃣ Requery with eager loading (student + mentor + students)
        msg = (
            db.session.query(MentorMessage)
            .options(
                joinedload(MentorMessage.student),
                joinedload(MentorMessage.mentor).joinedload(Mentor.students),
            )
            .filter_by(id=msg.id)
            .first()
        )

        return msg



def serialize_message_with_read_status(db, msg, batch_year=None):
    students = []
    
    # 1. Filter students by batch year
    valid_students = []
    for s in msg.mentor.students:  # StudentAuth objects
        if batch_year and str(s.batch_year) != str(batch_year):
            continue
        valid_students.append(s)
        
    if not valid_students:
        return {**msg.to_dict(), "read_status": []}
        
    # 2. Extract valid student IDs
    student_ids = [s.id for s in valid_students]
    
    # 3. Bulk fetch all statuses for these students and this message in ONE query
    statuses = (
        db.session.query(StudentMessageStatus)
        .filter(
            StudentMessageStatus.msg_id == msg.id,
            StudentMessageStatus.student_id.in_(student_ids)
        )
        .all()
    )
    
    # 4. Create an in-memory lookup dict {student_id: read_status_boolean}
    status_map = {st.student_id: st.read for st in statuses}
    
    # 5. Build final result array
    for s in valid_students:
        students.append({
            "usn": s.usn,
            "name": s.name,
            "read": status_map.get(s.id, False)
        })
        
    return {**msg.to_dict(), "read_status": students}



# ---------------- Mentor APIs ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/students", methods=["GET"])
def get_mentor_students(mentor_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404
        students = []
        for s in mentor.students:  # direct students now
            if str(s.batch_year) != str(batch_year):
                continue
            students.append({
                "usn": s.usn,
                "name": s.name,
                "parent_name": s.parent_account.name if s.parent_account else None,
                "parent_email": s.parent_account.email if s.parent_account else None,
                "parent_phone": s.parent_account.phone if s.parent_account else None
            })
    return jsonify({"students": students})



@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["GET"])
def get_messages(mentor_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        msgs = (
            MentorMessage.query.filter_by(mentor_id=mentor_id)
            .order_by(MentorMessage.id.desc())
            .all()
        )
        return jsonify([serialize_message_with_read_status(db, m, batch_year) for m in msgs])


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["POST"])
def create_message(mentor_id):
    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Subject and message required"}), 400

    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        msg = save_message(mentor_id, usn, recipient_type, subject, message)
        result = serialize_message_with_read_status(db, msg, batch_year)   # ✅ pass db

    return jsonify(result), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/student", methods=["POST"])
def send_email_student(mentor_id):

    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        student = StudentAuth.query.filter_by(usn=usn).first()
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
        if success:
            # Get the student's FCM token from DB (you must store it when they log in from frontend)
            fcm_token = getattr(student, "fcm_token", None)

            if fcm_token:
                logger.debug("FCM token for", student.usn, ":", fcm_token)
                notification = messaging.Message(
                    notification=messaging.Notification(
                        title=f"New message from {mentor.name}",
                        body=subject or "You have a new email",
                    ),
                    token=fcm_token,
                    webpush=messaging.WebpushConfig(
                        headers={"Urgency": "high"},
                        notification=messaging.WebpushNotification(
                            title=f"New message from {mentor.name}",
                            body=subject or "You have a new email",
                            icon="/firebase-logo.png"
                        ),
                    )
                )

                try:
                    response = messaging.send(notification)
                    logger.debug("Notification sent:", response)
                except Exception as e:
                    logger.debug("Error sending FCM:", e)


        return jsonify({"success": success}), (200 if success else 500)


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/all", methods=["POST"])
def send_email_all(mentor_id):
    data = request.get_json() or {}
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404

        results = []
        for s in mentor.students:  # direct now
            if str(s.batch_year) != str(batch_year):
                continue

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

            results.append({"usn": s.usn, "success": success})

        return jsonify(results), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(mentor_id, msg_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    logger.debug(f"from del message {batch_year}")
    with bm.session_scope(batch_year) as db:
        all_msgs = MentorMessage.query.all()
        logger.debug("Existing messages:", [ (m.id, m.mentor_id) for m in all_msgs ])

        msg = MentorMessage.query.filter_by(id=msg_id, mentor_id=mentor_id).first()
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        # Delete related student statuses manually
        StudentMessageStatus.query.filter_by(msg_id=msg_id).delete()

        # Delete the message itself
        db.session.delete(msg)
        db.session.commit()
        return jsonify({"success": True})
