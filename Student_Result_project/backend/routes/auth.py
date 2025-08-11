from flask import Blueprint, request, jsonify, session
from app_init import db, bcrypt
from models import User, Teacher

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth", methods=["POST"])
def auth():
    # If already logged in, skip password check
    if "user_id" in session and "who" in session:
        return jsonify({
            "message": "Already logged in",
            "id": session["user_id"],
            "name": session["name"]
        })

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
            "name": user.name
        })
    else:
        return jsonify({"error": "Incorrect password"}), 401

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
