import jwt
import datetime

from security import check_password
from models.schema import StudentAuth, Teacher, ParentAuth
from services.batch_manager import bm
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from repositories.parent_repository import ParentRepository
from settings import settings
from logger_config import get_logger

logger = get_logger(__name__)


def batch_from_usn(usn: str) -> int:
    # Example: 1JS23CS001 → "23" → 2023
    try:
        if len(usn) > 5:
            year_suffix = usn[3:5]  # "23"
            return 2000 + int(year_suffix)
    except Exception:
        pass
    return 2022  # fallback


async def authenticate_user(
    who: str, username: str, password: str, provided_batch_year: int = None
):
    batch_year = None
    user = None

    # Determine batch_year
    if who == "Student":
        batch_year = batch_from_usn(username)
    elif who == "Staff":
        batch_year = provided_batch_year
    elif who == "Parent":
        batch_year = batch_from_usn(username)

    if batch_year is None:
        batch_year = 2022

    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        mentor_repo = MentorRepository(session)
        parent_repo = ParentRepository(session)

        if who == "Student":
            user = await student_repo.get_auth_by_usn(username)
        elif who == "Staff":
            user = await mentor_repo.get_teacher_by_username(username)
        elif who == "Parent":
            user = await parent_repo.get_auth_by_username(username)
            if user and user.student:
                batch_year = batch_from_usn(user.student.usn)
        else:
            # fallback, try all
            user = (
                await student_repo.get_auth_by_usn(username)
                or await mentor_repo.get_teacher_by_username(username)
                or await parent_repo.get_auth_by_username(username)
            )

        if not user:
            return None, "User not found", 404

        # Check password
        if not check_password(password, user.password):
            return None, "Invalid credentials", 401

        # Determine role if missing
        if who is None:
            if isinstance(user, StudentAuth):
                who = "Student"
            elif isinstance(user, Teacher):
                who = "Staff"
            elif isinstance(user, ParentAuth):
                who = "Parent"

        mentor_id = None
        if who == "Staff":
            mentor_id = getattr(user, "mentor_id", None)
        elif who == "Parent" and user.student and user.student.mentor:
            mentor_id = user.student.mentor.id

        session_data = {
            "user_id": username,
            "who": who,
            "batch_year": batch_year,
            "name": getattr(user, "name", username),
            "mentor_id": mentor_id,
        }

    payload = {
        "id": username,
        "name": getattr(user, "name", username),
        "who": who,
        "batch_year": batch_year,
        "mentor_id": mentor_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8),
    }

    try:
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    except Exception as e:
        logger.error(f"JWT Encode error: {e}")
        return None, "Token generation failed", 500

    return {"token": token, "session_data": session_data}, None, 200


async def update_fcm_token(usn: str, token: str, batch_year: int):
    if not token:
        return False, "Missing token", 400

    async with bm.session_scope(batch_year) as session:
        student_repo = StudentRepository(session)
        student = await student_repo.get_auth_by_usn(usn)
        if not student:
            return False, "Student not found", 404

        student.fcm_token = token
        await session.commit()

    return True, None, 200
