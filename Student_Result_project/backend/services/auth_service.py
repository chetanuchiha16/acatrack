import jwt
import datetime
from flask import current_app
from app_init import bcrypt
from models.schema import StudentAuth, Teacher, ParentAuth
from services.batch_manager import bm
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from repositories.parent_repository import ParentRepository
from logger_config import get_logger

logger = get_logger(__name__)

def batch_from_usn(usn: str) -> int:
    # Example: 1JS23CS001 → "23" → 2023
    try:
        if len(usn) > 5:
            year_suffix = usn[3:5]   # "23"
            return 2000 + int(year_suffix)
    except Exception:
        pass
    return 2022 # fallback

def authenticate_user(who: str, username: str, password: str, provided_batch_year: int = None):
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
    
    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        mentor_repo = MentorRepository(db.session)
        parent_repo = ParentRepository(db.session)

        if who == "Student":
            user = student_repo.get_auth_by_usn(username)
        elif who == "Staff":
            user = mentor_repo.get_teacher_by_username(username)
        elif who == "Parent":
            user = parent_repo.get_auth_by_username(username)
            if user and user.student:
                batch_year = batch_from_usn(user.student.usn)
        else:
            # fallback, try all
            user = (student_repo.get_auth_by_usn(username) or
                    mentor_repo.get_teacher_by_username(username) or
                    parent_repo.get_auth_by_username(username))

        if not user:
            return None, "User not found", 404

        # Check password
        if not bcrypt.check_password_hash(user.password, password):
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
            "mentor_id": mentor_id
        }

    payload = {
        "id": username,
        "name": getattr(user, "name", username),
        "who": who,
        "batch_year": batch_year,
        "mentor_id": mentor_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }

    try:
        secret = current_app.config["SECRET_KEY"]
        token = jwt.encode(payload, secret, algorithm="HS256")
    except Exception as e:
        logger.error(f"JWT Encode error: {e}")
        return None, "Token generation failed", 500

    return {"token": token, "session_data": session_data}, None, 200

def update_fcm_token(usn: str, token: str, batch_year: int):
    if not token:
        return False, "Missing token", 400

    with bm.session_scope(batch_year) as db:
        student_repo = StudentRepository(db.session)
        student = student_repo.get_auth_by_usn(usn)
        if not student:
            return False, "Student not found", 404

        student.fcm_token = token
        db.session.commit()

    return True, None, 200
