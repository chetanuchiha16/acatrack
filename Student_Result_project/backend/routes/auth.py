from flask import Blueprint, request, jsonify, session
from app_init import bcrypt
from models import StudentAuth, Teacher, ParentAuth
from models.batch_manager import BatchManager, bm

auth_bp = Blueprint("auth", __name__)


def batch_from_usn(usn: str) -> int:
    # Example: 1JS23CS001 → "23" → 2023
    year_suffix = usn[3:5]   # "23"
    return 2000 + int(year_suffix)

@auth_bp.route("/auth", methods=["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")
    batch_year = None
    user = None

    # Determine batch_year
    if who == "Student":
        batch_year = batch_from_usn(username)
    elif who == "Staff":
        batch_year = request.json.get("batch_year")
        if not batch_year:
            return jsonify({"error": "Batch year required for Staff"}), 400
        batch_year = int(batch_year)
    elif who == "Parent":
        # For parent, we will detect after loading student
        pass

    # Get batch-specific app & enter context
    if batch_year is None:
        # fallback: could try default batch 2024
        batch_year = 2024
    
    with bm.session_scope(batch_year) as db:
        if who == "Student":
            user = StudentAuth.query.filter_by(username=username).first()
        elif who == "Staff":
            user = Teacher.query.filter_by(username=username).first()
        elif who == "Parent":
            user = ParentAuth.query.filter_by(username=username).first()
            if user and user.student:
                batch_year = batch_from_usn(user.student.username)
        else:
            # fallback, try all
            user = (StudentAuth.query.filter_by(username=username).first() or
                    Teacher.query.filter_by(username=username).first() or
                    ParentAuth.query.filter_by(username=username).first())

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check password
        if not bcrypt.check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Determine role if missing
        if who is None:
            if isinstance(user, StudentAuth):
                who = "Student"
            elif isinstance(user, Teacher):
                who = "Staff"
            elif isinstance(user, ParentAuth):
                who = "Parent"

        # Save session
        session["user_id"] = username
        session["who"] = who
        session["batch_year"] = batch_year
        session["name"] = getattr(user, "name", username)

        # Mentor info
        mentor_id = None
        if who == "Staff":
            mentor_id = getattr(user, "mentor_id", None)
        elif who == "Parent" and user.student and user.student.mentor:
            mentor_id = user.student.mentor.id

    return jsonify({
        "message": "Login success",
        "id": username,
        "name": session["name"],
        "who": who,
        "batch_year": batch_year,
        "mentor_id": mentor_id,
        "relation": getattr(user, "relation", None) if who == "Parent" else None
    })


@auth_bp.route("/auth/status", methods=["GET"])
def auth_status():
    if "user_id" in session and "who" in session:
        return jsonify({
            "logged_in": True,
            "id": session["user_id"],
            "name": session["name"],
            "who": session["who"],
            "batch_year": session.get("batch_year")  # <-- return batch
        })
    else:
        return jsonify({
            "logged_in": False,
            "message": "Not logged in"
        }), 200  # 200 instead of 401 so frontend doesn’t treat it as an error



@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
