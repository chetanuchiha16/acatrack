from flask import Blueprint, session, jsonify
from models import ParentAuth
from models.batch_manager import bm, BatchManager
from models.helpers import get_batch_year, get_jwt_payload, get_user_id
parent_bp = Blueprint("parent", __name__)
  # decode JWT from Authorization header

@parent_bp.route("/parent/student-details", methods=["GET"])
def get_student_details():
    payload = get_jwt_payload()
    batch_year = get_batch_year()
    with bm.session_scope(batch_year) as db:
        # Check if parent is logged in
        
        if not payload or payload.get("who") != "Parent":
            return jsonify({"error": "Unauthorized"}), 403

        parent = ParentAuth.query.filter_by(username= get_user_id()).first()
        if not parent or not parent.student:
            return jsonify({"error": "Student not linked"}), 404

        student = parent.student
        mentor = student.mentor

        # 👇 fetch the teacher who has this mentor_id
        teacher = None
        if mentor:
            from models import Teacher
            teacher = Teacher.query.filter_by(mentor_id=mentor.id).first()

        return jsonify({
            "student": {
                "usn": student.usn,
                "name": student.name,
                "email": student.student_email,
                "phone": student.student_phno
            },
            "mentor": {
                "id": mentor.id,
                "name": mentor.name,
                "email": teacher.email if teacher else None,
                "phone": teacher.phone if teacher else None,
            } if mentor else None
        })