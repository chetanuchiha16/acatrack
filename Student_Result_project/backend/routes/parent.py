from flask import Blueprint, session, jsonify
from models import ParentAuth

parent_bp = Blueprint("parent", __name__)

@parent_bp.route("/parent/student-details", methods=["GET"])
def get_student_details():
    # Check if parent is logged in
    if "user_id" not in session or session.get("who") != "Parent":
        return jsonify({"error": "Unauthorized"}), 403

    parent = ParentAuth.query.filter_by(username=session["user_id"]).first()
    if not parent or not parent.student:
        return jsonify({"error": "Student not linked"}), 404

    student = parent.student
    mentor = student.mentor

    return jsonify({
        "student": {
            "usn": student.username,
            "name": student.name,
            "email": student.student_email,
            "phone": student.student_phno
        },
        "mentor": {
            "id": mentor.id if mentor else None,
            "name": mentor.name if mentor else None
        }
    })
