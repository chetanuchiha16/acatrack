from firebase_admin import messaging
from flask import Blueprint, jsonify, request
from models import Mentor, MentorMessage, StudentMessageStatus
from models.batch_manager import bm
from models.helpers import get_batch_year
from repositories.mentor_repository import MentorRepository
from repositories.student_repository import StudentRepository
from routes.send_email import send_email_async
from sqlalchemy.orm import joinedload

# Import validators and async email
from validators.email_validators import SaveMessageRequest, SendStudentEmailRequest

mentor_email_bp = Blueprint("mentor_email", __name__)


# ---------------- Save Message ----------------
def save_message(mentor_id, usn, recipient_type, subject, message, email_failed=False):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        student_repo = StudentRepository(db.session)

        mentor = mentor_repo.get_by_id(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        # Lookup student to get ID
        student = student_repo.get_auth_by_usn(usn) if usn else None

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
            StudentMessageStatus.student_id.in_(student_ids),
        )
        .all()
    )

    # 4. Create an in-memory lookup dict {student_id: read_status_boolean}
    status_map = {st.student_id: st.read for st in statuses}

    # 5. Build final result array
    for s in valid_students:
        students.append(
            {"usn": s.usn, "name": s.name, "read": status_map.get(s.id, False)}
        )

    return {**msg.to_dict(), "read_status": students}


# ---------------- Mentor APIs ----------------
@mentor_email_bp.route(
    "/mentor/<int:mentor_id>/messages/<int:msg_id>", methods=["DELETE"]
)
def delete_message(mentor_id, msg_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        msg = mentor_repo.get_message_by_id(msg_id)

        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if msg.mentor_id != mentor_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Delete related student statuses manually
        db.session.query(StudentMessageStatus).filter_by(msg_id=msg_id).delete()

        db.session.delete(msg)
        db.session.commit()

    return jsonify({"success": True}), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/students", methods=["GET"])
def get_mentor_students(mentor_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        mentor = mentor_repo.get_by_id(mentor_id)
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404
        students = []
        for s in mentor.students:  # direct students now
            if str(s.batch_year) != str(batch_year):
                continue
            students.append(
                {
                    "usn": s.usn,
                    "name": s.name,
                    "parent_name": s.parent_account.name if s.parent_account else None,
                    "parent_email": s.parent_account.email
                    if s.parent_account
                    else None,
                    "parent_phone": s.parent_account.phone
                    if s.parent_account
                    else None,
                }
            )
    return jsonify({"students": students})


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["GET"])
def get_messages(mentor_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        msgs = mentor_repo.get_messages_by_mentor(mentor_id)
        return jsonify(
            [serialize_message_with_read_status(db, m, batch_year) for m in msgs]
        )


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["POST"])
def send_mentor_message(mentor_id):
    validated_data = SaveMessageRequest.model_validate(request.get_json() or {})
    usn = validated_data.usn
    recipient_type = validated_data.recipientType
    subject = validated_data.subject
    message = validated_data.message

    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        msg = save_message(mentor_id, usn, recipient_type, subject, message)
        result = serialize_message_with_read_status(db, msg, batch_year)

    return jsonify(result), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/student", methods=["POST"])
def send_email_student(mentor_id):
    validated_data = SendStudentEmailRequest.model_validate(request.get_json() or {})
    usn = validated_data.usn
    recipient_type = validated_data.recipientType
    subject = validated_data.subject
    message = validated_data.message

    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        student = student_repo.get_auth_by_usn(usn)
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if recipient_type == "parent":
            to_email = getattr(student, "parent_email", None)
            name = getattr(student, "parent_name", None) or student.name
        else:
            to_email = getattr(student, "student_email", None)
            name = student.name

        mentor = mentor_repo.get_by_id(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        full_message = f"Hello {name},\n\n{message}{sender_info}"

        # Save message first
        msg_obj = save_message(mentor_id, usn, recipient_type, subject, message)

        if to_email:
            send_email_async(to_email, subject, full_message)
        else:
            # Mark failed if no email
            msg_obj.email_failed = True
            db.session.commit()

        # Try push notification if applicable
        fcm_token = getattr(student, "fcm_token", None)
        if fcm_token:
            try:
                notification = messaging.Notification(
                    title=f"New message from Mentor: {subject}", body=message
                )
                fb_msg = messaging.Message(notification=notification, token=fcm_token)
                messaging.send(fb_msg)
            except Exception:
                pass  # FCM fail shouldn't break the API endpoint

    return jsonify({"success": True}), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/all", methods=["POST"])
def send_email_all(mentor_id):
    data = request.get_json() or {}
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        mentor = mentor_repo.get_by_id(mentor_id)
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

        return jsonify(results), 200
