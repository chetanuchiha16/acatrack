from flask import Blueprint, request, jsonify, session
from app_init import db, bcrypt
from models import User, Teacher

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth", methods=["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")

    # Decide which model to check based on 'who'
    if who == "Student":
        user = User.query.filter_by(username=username).first()
    elif who == "Teacher":
        user = Teacher.query.filter_by(username=username).first()
    else:
        # If 'who' not provided or unknown, check both
        user = User.query.filter_by(username=username).first() \
               or Teacher.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check password
    if bcrypt.check_password_hash(user.password, password):
        # Store login info in session
        session["user_id"] = username
        session["name"] = user.name
        session["who"] = who or ("Teacher" if isinstance(user, Teacher) else "Student")

        return jsonify({
            "message": "Login success",
            "id": username,
            "name": user.name,
            "who": session["who"]
        })
    else:
        return jsonify({"error": "Incorrect password"}), 401


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
