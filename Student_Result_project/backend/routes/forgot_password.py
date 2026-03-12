from flask import Blueprint, request, jsonify, session
from models import db, PasswordResetToken
from repositories.student_repository import StudentRepository
from repositories.parent_repository import ParentRepository
from repositories.mentor_repository import MentorRepository
from .send_email import send_email
import secrets
from datetime import datetime, timedelta, timezone
from app_init import bcrypt
from models.batch_manager import bm, BatchManager
from models.paths import API_BASE
forgot_bp = Blueprint("forgot", __name__, url_prefix="/auth/forgot")
from .auth import batch_from_usn

def find_user(usn, batch_year):
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        parent_repo = ParentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        user = student_repo.get_auth_by_usn(usn)
        if user:
            return user, "student", user.student_email
        user = parent_repo.get_auth_by_username(usn)
        if user:
            return user, "parent", user.email
        user = mentor_repo.get_teacher_by_username(usn)
        if user:
            return user, "teacher", user.email
        return None, None, None


@forgot_bp.route("/request", methods=["POST"])
def request_reset():
    data = request.get_json()
    username = data.get("username")
    batch_year = batch_from_usn(username)
    session["batch_year"] = batch_year
    if not username:
        return jsonify({"error": "Username is required"}), 400

    user, role, email = find_user(username, batch_year)
    if not user or not email:
        return jsonify({"error": "User not found or no email"}), 404

    # generate token
    token = secrets.token_urlsafe(32)

    # store as naive UTC (SQLite safe)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).replace(tzinfo=None)
    with bm.session_scope(batch_year) as db:
        reset_token = PasswordResetToken(
            token=token,
            usn=username,
            batch_year=batch_year,   # store it ✅
            role=role,
            expires_at=expires_at
        )
        db.session.add(reset_token)
        db.session.commit()

        reset_link = f"{API_BASE}/reset-password/{token}"
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

    # Step 1: Find token in ANY batch (small loop)
    reset_token = None
    token_batch_year = None
    for batch_year in bm.list_batches():
        with bm.session_scope(batch_year) as db:
            reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
            if reset_token:
                token_batch_year = reset_token.batch_year
                break

    if not reset_token:
        return jsonify({"error": "Invalid token"}), 400

    # Step 2: Now use the correct batch
    with bm.session_scope(token_batch_year) as db:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if reset_token.expires_at < now:
            return jsonify({"error": "Invalid or expired token"}), 400

        usn, role = reset_token.usn, reset_token.role
        
        student_repo = StudentRepository(db.session)
        parent_repo = ParentRepository(db.session)
        mentor_repo = MentorRepository(db.session)

        if role == "student":
            user = student_repo.get_auth_by_usn(usn)
        elif role == "parent":
            user = parent_repo.get_auth_by_username(usn)
        else:
            user = mentor_repo.get_teacher_by_username(usn)

        if not user:
            return jsonify({"error": "User not found"}), 404

        hashed_pw = bcrypt.generate_password_hash(new_password).decode("utf-8")
        user.password = hashed_pw
        reset_token.used = True
        db.session.commit()

        return jsonify({"message": f"{role.capitalize()} password reset successful"}), 200
