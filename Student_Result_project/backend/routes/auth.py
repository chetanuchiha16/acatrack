from flask import Blueprint, request, jsonify, session
from app_init import db, bcrypt
from models import StudentAuth, Teacher, ParentAuth

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth", methods=["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")

    # Decide which model to check based on 'who'
    if who == "Student":
        user = StudentAuth.query.filter_by(username=username).first()
    elif who == "Teacher":
        user = Teacher.query.filter_by(username=username).first()
    elif who == "Parent":
        user = ParentAuth.query.filter_by(username = username).first()
    else:
        # If 'who' not provided or unknown, check both
        user = StudentAuth.query.filter_by(username=username).first() \
               or Teacher.query.filter_by(username=username).first() \
               or ParentAuth.query.filter_by(username = username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if bcrypt.check_password_hash(user.password, password):
        # Figure out role dynamically if not provided
        if who is None:
            if isinstance(user, StudentAuth):
                who = "Student"
            elif isinstance(user, Teacher):
                who = "Teacher"
            elif isinstance(user, ParentAuth):
                who = "Parent"

        # Pick a display name depending on role
        if who == "Parent":
            # Prefer actual parent name if available
            if user.name:
                display_name = user.name
            else:
                display_name = f"Parent of {user.student.name}"

            # Also grab relation if you added that column
            relation = getattr(user, "relation", None)
        else:
            display_name = getattr(user, "name", username)
            relation = None


        # Store login info in session
        session["user_id"] = username
        session["name"] = display_name
        session["who"] = who

        mentor_id = None

        if who == "Staff":
            mentor_id = getattr(user, "mentor_id", None)

        elif who == "Parent":
            # parent → student → mentors (list of MentorStudent objects)
            if user.student and user.student.mentor:
                # Example: just pick the first mentor_id
                mentor_id = user.student.mentor.id

        return jsonify({
            "message": "Login success",
            "id": username,
            "name": display_name,
            "who": who,
            "relation": getattr(user, "relation", None) if who == "Parent" else None,
            "mentor_id": mentor_id
        })





@auth_bp.route("/auth/status", methods=["GET"])
def auth_status():
    if "user_id" in session and "who" in session:
        return jsonify({
            "logged_in": True,
            "id": session["user_id"],
            "name": session["name"],
            "who": session["who"]
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
