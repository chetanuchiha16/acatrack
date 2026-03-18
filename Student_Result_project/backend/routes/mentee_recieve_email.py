from flask import Blueprint, jsonify
from .mentor_send_email import MentorMessage, StudentMessageStatus
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from datetime import timezone
from utils.helpers import get_batch_year
student_email_bp = Blueprint("student_email", __name__)
from services.batch_manager import bm

# ✅ Utility to serialize MentorMessage with required fields
def serialize_message(db, msg, student, status_map=None, mentor_map=None):
    if status_map is not None:
        status = status_map.get(msg.id)
    else:
        status = db.session.query(StudentMessageStatus).filter_by(student_id=student.id, msg_id=msg.id).first()
        
    if mentor_map is not None:
        mentor = mentor_map.get(getattr(msg, "mentor_id", None))
    else:
        mentor_repo = MentorRepository(db.session)
        mentor = mentor_repo.get_by_id(msg.mentor_id) if hasattr(msg, "mentor_id") else None

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
    batch_year = get_batch_year()  # however you infer it
    
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        student = student_repo.get_auth_by_usn(usn)
        if not student:
            return jsonify({"error": "Student not found"}), 404

        msgs = (
            db.session.query(MentorMessage)
            .filter((MentorMessage.student_id == student.id) | (MentorMessage.student_id == None))
            .order_by(MentorMessage.id.desc())
            .all()
        )

        if not msgs:
            return jsonify([])

        msg_ids = [m.id for m in msgs]
        mentor_ids = list(set([m.mentor_id for m in msgs if hasattr(m, "mentor_id") and m.mentor_id is not None]))

        statuses = db.session.query(StudentMessageStatus).filter(
            StudentMessageStatus.student_id == student.id,
            StudentMessageStatus.msg_id.in_(msg_ids)
        ).all()
        status_map = {s.msg_id: s for s in statuses}

        mentors = mentor_repo.get_mentors_by_ids(mentor_ids) if mentor_ids else []
        mentor_map = {m.id: m for m in mentors}

        results = [serialize_message(db, m, student, status_map, mentor_map) for m in msgs]
        return jsonify(results)


@student_email_bp.route("/student/<string:usn>/messages/<int:msg_id>", methods=["GET"])
def get_student_message_detail(usn, msg_id):
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        student = student_repo.get_auth_by_usn(usn)
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        msg = mentor_repo.get_message_by_id(msg_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if msg.student_id not in (None, student.id):
            return jsonify({"error": "Not authorized to view this message"}), 403

        return jsonify(serialize_message(db, msg, student))


@student_email_bp.route("/student/<string:usn>/messages/<int:msg_id>/read", methods=["POST"])
def mark_message_read(usn, msg_id):
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        student = student_repo.get_auth_by_usn(usn)
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        msg = mentor_repo.get_message_by_id(msg_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if msg.student_id not in (None, student.id):
            return jsonify({"error": "Not authorized to update this message"}), 403

        status = db.session.query(StudentMessageStatus).filter_by(student_id=student.id, msg_id=msg_id).first()
        if not status:
            status = StudentMessageStatus(student_id=student.id, msg_id=msg_id, read=True)
            db.session.add(status)
        else:
            status.read = True

        db.session.commit()
        return jsonify({"message": f"Message {msg_id} marked as read by {usn}"}), 200
