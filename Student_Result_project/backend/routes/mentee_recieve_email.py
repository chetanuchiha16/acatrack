from flask import Blueprint, request, jsonify, session
from models import StudentAuth, Mentor
from app_init import db
from .mentor_send_email import MentorMessage, StudentMessageStatus
from datetime import datetime, timezone
student_email_bp = Blueprint("student_email", __name__)
from models.batch_manager import BatchManager, bm

# ✅ Utility to serialize MentorMessage with required fields
def serialize_message(msg, usn):
    status = StudentMessageStatus.query.filter_by(student_usn=usn, msg_id=msg.id).first()
    mentor = Mentor.query.filter_by(id=msg.mentor_id).first() if hasattr(msg, "mentor_id") else None

    dt = msg.created_at
    if dt and dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return {
        "id": msg.id,
        "subject": getattr(msg, "subject", None),
        "message": getattr(msg, "message", None),
        "mentor_name": mentor.name if mentor else None,
        "read": status.read if status else False,
        "created_at": dt.isoformat() if dt else None,  # ✅ add this
    }



@student_email_bp.route("/student/<string:usn>/messages", methods=["GET"])
def get_student_messages(usn):
    batch_year = session.get("batch_year")  # however you infer it
    
    with bm.session_scope(batch_year) as db:
        msgs = (
            MentorMessage.query
            .filter((MentorMessage.student_usn == usn) | (MentorMessage.student_usn == None))
            .order_by(MentorMessage.id.desc())
            .all()
        )

        results = [serialize_message(m, usn) for m in msgs]
        return jsonify(results)


@student_email_bp.route("/student/<string:usn>/messages/<int:msg_id>", methods=["GET"])
def get_student_message_detail(usn, msg_id):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        msg = MentorMessage.query.filter_by(id=msg_id).first()
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if msg.student_usn not in (None, usn):
            return jsonify({"error": "Not authorized to view this message"}), 403

        return jsonify(serialize_message(msg, usn))


@student_email_bp.route("/student/<string:usn>/messages/<int:msg_id>/read", methods=["POST"])
def mark_message_read(usn, msg_id):
    batch_year = session.get("batch_year")
    with bm.session_scope(batch_year) as db:
        msg = MentorMessage.query.filter_by(id=msg_id).first()
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if msg.student_usn not in (None, usn):
            return jsonify({"error": "Not authorized to update this message"}), 403

        status = StudentMessageStatus.query.filter_by(student_usn=usn, msg_id=msg_id).first()
        if not status:
            status = StudentMessageStatus(student_usn=usn, msg_id=msg_id, read=True)
            db.session.add(status)
        else:
            status.read = True

        db.session.commit()
        return jsonify({"message": f"Message {msg_id} marked as read by {usn}"}), 200
