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
        user = User.query.filter_by(username=username).first() \
               or Teacher.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if bcrypt.check_password_hash(user.password, password):
        # ✅ Store minimal info in session (avoid password)
        session["user"] = {
            "username": username,
            "name": user.name,
            "role": who
        }
        return jsonify({
            "message": "Login success",
            "id": username,
            "name": user.name
        }), 200
    else:
        return jsonify({"error": "Incorrect password"}), 401


@auth_bp.route("/auth", methods=["GET"])
def me():
    user_data = session.get("user")
    if not user_data:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify(user_data), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"message": "Logged out"}), 200
