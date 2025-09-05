from flask import Blueprint, request, jsonify
from models import db, StudentAuth, ParentAuth, Teacher, PasswordResetToken
from .send_email import send_email
import secrets
from datetime import datetime, timedelta, timezone
from app_init import bcrypt

forgot_bp = Blueprint("forgot", __name__, url_prefix="/auth/forgot")


def find_user(usn):
    user = StudentAuth.query.filter_by(username=usn).first()
    if user:
        return user, "student", user.student_email
    user = ParentAuth.query.filter_by(username=usn).first()
    if user:
        return user, "parent", user.email
    user = Teacher.query.filter_by(username=usn).first()
    if user:
        return user, "teacher", user.email
    return None, None, None


@forgot_bp.route("/request", methods=["POST"])
def request_reset():
    data = request.get_json()
    username = data.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    user, role, email = find_user(username)
    if not user or not email:
        return jsonify({"error": "User not found or no email"}), 404

    # generate token
    token = secrets.token_urlsafe(32)

    # store as naive UTC (SQLite safe)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).replace(tzinfo=None)

    reset_token = PasswordResetToken(
        token=token,
        usn=username,
        role=role,
        expires_at=expires_at
    )
    db.session.add(reset_token)
    db.session.commit()

    reset_link = f"http://localhost:5173/reset-password/{token}"
    subject = "Password Reset Request"
    body = f"Hello {user.name},\n\nClick below to reset your password:\n{reset_link}\n\nThis link expires in 15 minutes."

    if not send_email(email, subject, body):
        return jsonify({"error": "Failed to send reset email"}), 500

    return jsonify({"message": "Password reset link sent"}), 200


@forgot_bp.route("/reset/<token>", methods=["POST"])
def reset_password(token):
    data = request.get_json()
    new_password = data.get("password")

    if not new_password:
        return jsonify({"error": "Password is required"}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not reset_token:
        return jsonify({"error": "Invalid token"}), 400

    # compare as naive UTC
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if reset_token.expires_at < now:
        return jsonify({"error": "Invalid or expired token"}), 400

    usn, role = reset_token.usn, reset_token.role
    if role == "student":
        user = StudentAuth.query.filter_by(username=usn).first()
    elif role == "parent":
        user = ParentAuth.query.filter_by(username=usn).first()
    else:
        user = Teacher.query.filter_by(username=usn).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # hash new password with bcrypt
    hashed_pw = bcrypt.generate_password_hash(new_password).decode("utf-8")
    user.password = hashed_pw
    reset_token.used = True  # mark token as used
    db.session.commit()

    return jsonify({"message": f"{role.capitalize()} password reset successful"}), 200
