import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from models import PasswordResetToken
from services.batch_manager import bm
from models.paths import API_BASE
from pydantic import BaseModel, Field
from repositories.mentor_repository import MentorRepository
from repositories.parent_repository import ParentRepository
from repositories.student_repository import StudentRepository
from routes.send_email import send_email_async
from security import hash_password
from sqlalchemy import select

from services.auth_service import batch_from_usn


class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., min_length=1)


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)


router = APIRouter(prefix="/auth/forgot", tags=["forgot_password"])


async def find_user(usn, batch_year):
    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        parent_repo = ParentRepository(session)
        mentor_repo = MentorRepository(session)

        user = await student_repo.get_auth_by_usn(usn)
        if user:
            return user, "student", user.student_email
        user = await parent_repo.get_auth_by_username(usn)
        if user:
            return user, "parent", user.email
        user = await mentor_repo.get_teacher_by_username(usn)
        if user:
            return user, "teacher", user.email
        return None, None, None


@router.post("/request")
async def request_reset(body: ForgotPasswordRequest):
    username = body.username

    try:
        batch_year = batch_from_usn(username)
    except ValueError:
        batch_year = None

    user, role, email = await find_user(username, batch_year)
    if not user or not email:
        return JSONResponse(content={"error": "User not found or no email"}, status_code=404)

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).replace(tzinfo=None)

    async with bm.session_scope(batch_year) as session:
        reset_token = PasswordResetToken(
            token=token,
            usn=username,
            batch_year=batch_year,
            role=role,
            expires_at=expires_at,
        )
        session.add(reset_token)
        await session.commit()

    reset_link = f"{API_BASE}/reset-password?token={token}"
    subject = "Password Reset Request"
    body_text = f"""Hello,

We received a request to reset your password.
Click the link below to set a new password:
{reset_link}

This link is valid for 15 minutes.
If you did not request this, please ignore this email.
    """
    send_email_async(email, subject, body_text)

    return {"message": "Password reset link sent to registered email"}


@router.post("/reset/{token}")
async def reset_password(token: str, body: ResetPasswordRequest):
    new_password = body.password

    reset_token = None
    token_batch_year = None
    batches = await bm.list_batches()

    for batch_year in batches:
        async with bm.session_scope(batch_year) as session:
            result = await session.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.token == token,
                    PasswordResetToken.used == False,
                )
            )
            reset_token = result.scalars().first()
            if reset_token:
                token_batch_year = reset_token.batch_year
                break

    if not reset_token:
        return JSONResponse(content={"error": "Invalid token"}, status_code=400)

    async with bm.session_scope(token_batch_year) as session:
        # Re-fetch within this session
        result = await session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        )
        reset_token = result.scalars().first()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if reset_token.expires_at < now:
            return JSONResponse(content={"error": "Invalid or expired token"}, status_code=400)

        usn, role = reset_token.usn, reset_token.role

        student_repo = StudentRepository(session)
        parent_repo = ParentRepository(session)
        mentor_repo = MentorRepository(session)

        if role == "student":
            user = await student_repo.get_auth_by_usn(usn)
        elif role == "parent":
            user = await parent_repo.get_auth_by_username(usn)
        else:
            user = await mentor_repo.get_teacher_by_username(usn)

        if not user:
            return JSONResponse(content={"error": "User not found"}, status_code=404)

        hashed_pw = hash_password(new_password)
        user.password = hashed_pw
        reset_token.used = True
        await session.commit()

        return {"message": f"{role.capitalize()} password reset successful"}
