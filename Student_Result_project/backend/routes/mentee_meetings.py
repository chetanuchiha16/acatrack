from flask import Blueprint, jsonify
from models import Meeting, StudentAuth as Student
from services.batch_manager import bm
from utils.helpers import get_batch_year

mentee_meetings_bp = Blueprint(
    "mentee_meetings", __name__, url_prefix="/auth/Student/Mentee/meeting"
)


@mentee_meetings_bp.route("/<string:student_usn>", methods=["GET"])
def get_mentee_meetings(student_usn):
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        student = Student.query.filter_by(usn=student_usn).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if not student.mentor_id:
            return jsonify({"error": "Student has no mentor assigned"}), 400

        meetings = (
            Meeting.query.filter_by(mentor_id=student.mentor_id)
            .order_by(Meeting.date)
            .all()
        )
        result = [
            {
                "id": m.id,
                "title": m.title,
                "agenda": m.agenda,
                "date": m.date.isoformat(),
            }
            for m in meetings
        ]
        return jsonify(result)
