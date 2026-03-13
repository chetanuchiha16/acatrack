import secrets
from datetime import datetime, timedelta, timezone

from app_init import bcrypt
from flask import Blueprint, jsonify, request, session
from models import PasswordResetToken
from models.batch_manager import bm
from models.paths import API_BASE
from pydantic import BaseModel, Field
from repositories.mentor_repository import MentorRepository
from repositories.parent_repository import ParentRepository
from repositories.student_repository import StudentRepository
from routes.send_email import send_email_async

from .auth import batch_from_usn


class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., min_length=1)


forgot_bp = Blueprint("forgot", __name__, url_prefix="/auth/forgot")


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
    validated_data = ForgotPasswordRequest.model_validate(request.get_json() or {})
    username = validated_data.username

    try:
        batch_year = batch_from_usn(username)
    except ValueError:
        batch_year = None
    session["batch_year"] = batch_year

    user, role, email = find_user(username, batch_year)
    if not user or not email:
        return jsonify({"error": "User not found or no email"}), 404

    # generate token
    token = secrets.token_urlsafe(32)

    # store as naive UTC (SQLite safe)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).replace(
        tzinfo=None
    )
    with bm.session_scope(batch_year) as db:
        reset_token = PasswordResetToken(
            token=token,
            usn=username,
            batch_year=batch_year,  # store it ✅
            role=role,
            expires_at=expires_at,
        )
        db.session.add(reset_token)
        db.session.commit()

    # Send email async
    reset_link = f"{API_BASE}/reset-password?token={token}"
    subject = "Password Reset Request"
    body = f"""Hello,

We received a request to reset your password.
Click the link below to set a new password:
{reset_link}

This link is valid for 15 minutes.
If you did not request this, please ignore this email.
    """
    send_email_async(email, subject, body)

    return jsonify({"message": "Password reset link sent to registered email"}), 200


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)


@forgot_bp.route("/reset/<token>", methods=["POST"])
def reset_password(token):
    validated_data = ResetPasswordRequest.model_validate(request.get_json() or {})
    new_password = validated_data.password

    # Step 1: Find token in ANY batch (small loop)
    reset_token = None
    token_batch_year = None
    for batch_year in bm.list_batches():
        with bm.session_scope(batch_year) as db:
            reset_token = PasswordResetToken.query.filter_by(
                token=token, used=False
            ).first()
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

        return jsonify(
            {"message": f"{role.capitalize()} password reset successful"}
        ), 200
