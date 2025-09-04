from flask import Blueprint, request, jsonify
from models import db, Meeting, StudentAuth as Student
from datetime import datetime

mentee_meetings_bp = Blueprint(
    "mentee_meetings", __name__, url_prefix="/auth/Student/Mentee/meeting"
)

@mentee_meetings_bp.route("/<string:student_usn>", methods=["GET"])
def get_mentee_meetings(student_usn):
    student = Student.query.filter_by(username=student_usn).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if not student.mentor_id:
        return jsonify({"error": "Student has no mentor assigned"}), 400

    meetings = Meeting.query.filter_by(mentor_id=student.mentor_id).order_by(Meeting.date).all()
    result = [
        {
            "id": m.id,
            "title": m.title,
            "agenda": m.agenda,
            "date": m.date.isoformat()
        } for m in meetings
    ]
    return jsonify(result)
