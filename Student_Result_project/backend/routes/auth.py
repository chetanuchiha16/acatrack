from flask import Blueprint, request, jsonify, session, current_app
from app_init import bcrypt
from models import StudentAuth, Teacher, ParentAuth
from models.batch_manager import BatchManager, bm
import jwt
import datetime
from models.helpers import get_batch_year, get_jwt_payload
from logger_config import get_logger

logger = get_logger(__name__)
auth_bp = Blueprint("auth", __name__)


def batch_from_usn(usn: str) -> int:
    # Example: 1JS23CS001 → "23" → 2023
    year_suffix = usn[3:5]   # "23"
    return 2000 + int(year_suffix)

@auth_bp.route("/batches", methods=["GET"])
def list_batches():
    batches = bm.list_batches()
    return jsonify({"batches": batches})


@auth_bp.route("/auth", methods=["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")
    batch_year = None
    user = None

    # Determine batch_year
    if who == "Student":
        batch_year = batch_from_usn(username)
    elif who == "Staff":
        # Staff access all batches. Let them select actively loaded batch in the dashboard UI.
        batch_year = request.json.get("batch_year")
    elif who == "Parent":
        # For parent, we will detect after loading student
        batch_year = batch_from_usn(username)

    # Get batch-specific app & enter context
    if batch_year is None:
        # fallback: could try default batch 2024
        batch_year = 2022
    
    with bm.session_scope(batch_year) as db:
        if who == "Student":
            user = StudentAuth.query.filter_by(usn=username).first()
        elif who == "Staff":
            user = Teacher.query.filter_by(username=username).first()
        elif who == "Parent":
            user = ParentAuth.query.filter_by(username=username).first()
            logger.debug(f"user parent")
            logger.debug(f"user and user.student: {user and user.student} {user} {batch_from_usn(user.student.usn) if user and user.student else None}")
            if user and user.student:

                batch_year = batch_from_usn(user.student.usn)
                logger.debug(f"{batch_year} from parent auth")
        else:
            # fallback, try all
            user = (StudentAuth.query.filter_by(usn=username).first() or
                    Teacher.query.filter_by(username=username).first() or
                    ParentAuth.query.filter_by(username=username).first())

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check password
        if not bcrypt.check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Determine role if missing
        if who is None:
            if isinstance(user, StudentAuth):
                who = "Student"
            elif isinstance(user, Teacher):
                who = "Staff"
            elif isinstance(user, ParentAuth):
                who = "Parent"

        # Save session
        session["user_id"] = username
        session["who"] = who
        session["batch_year"] = batch_year
        session["name"] = getattr(user, "name", username)

        # Mentor info
        mentor_id = None
        if who == "Staff":
            mentor_id = getattr(user, "mentor_id", None)
        elif who == "Parent" and user.student and user.student.mentor:
            mentor_id = user.student.mentor.id
        
        session["mentor_id"] = mentor_id

    payload = {
        "id": username,
        "name": getattr(user, "name", username),
        "who": who,
        "batch_year": batch_year,
        "mentor_id": mentor_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)  # expires in 8h
    }

    token = jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")
    return jsonify({"token": token})


@auth_bp.route("/auth/status", methods=["GET"])
def auth_status():
    payload = get_jwt_payload()  # decode JWT from Authorization header
    if payload:
        return jsonify({
            "logged_in": True,
            "id": payload.get("id"),
            "name": payload.get("name"),
            "who": payload.get("who"),
            "batch_year": payload.get("batch_year"),
            "mentor_id": payload.get("mentor_id"),
            

        })
    else:
        return jsonify({
            "logged_in": False,
            "message": "Not logged in"
        }), 401  # <- important



@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@auth_bp.route("/student/<usn>/fcm-token", methods=["POST"])
def save_fcm_token(usn):
    token = request.json.get("fcm_token")
    batch_year = get_batch_year()

    if not token:
        return jsonify({"error": "Missing token"}), 400

    with bm.session_scope(batch_year) as db:
        student = StudentAuth.query.filter_by(usn=usn).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        student.fcm_token = token
        db.session.commit()

    return jsonify({"success": True})