from flask import Blueprint, request, jsonify, session
from services.batch_manager import bm
from utils.helpers import get_batch_year, get_jwt_payload
from logger_config import get_logger
from services.auth_service import authenticate_user, update_fcm_token

logger = get_logger(__name__)
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/batches", methods=["GET"])
def list_batches():
    batches = bm.list_batches()
    return jsonify({"batches": batches})


@auth_bp.route("/auth", methods=["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")
    provided_batch_year = request.json.get("batch_year")

    result, error_msg, status_code = authenticate_user(
        who, username, password, provided_batch_year
    )

    from markupsafe import escape
    if error_msg:
        return jsonify({"error": escape(error_msg)}), status_code

    # Set session data safely using the dict returned by service
    session_data = result.get("session_data", {})
    for k, v in session_data.items():
        session[k] = v

    return jsonify({"token": result["token"]}), 200


@auth_bp.route("/auth/status", methods=["GET"])
def auth_status():
    payload = get_jwt_payload()
    if payload:
        return jsonify(
            {
                "logged_in": True,
                "id": payload.get("id"),
                "name": payload.get("name"),
                "who": payload.get("who"),
                "batch_year": payload.get("batch_year"),
                "mentor_id": payload.get("mentor_id"),
            }
        )
    else:
        return jsonify({"logged_in": False, "message": "Not logged in"}), 401


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@auth_bp.route("/student/<usn>/fcm-token", methods=["POST"])
def save_fcm_token(usn):
    token = request.json.get("fcm_token")
    batch_year = get_batch_year()

    success, error_msg, status_code = update_fcm_token(usn, token, batch_year)
    if not success:
        return jsonify({"error": error_msg}), status_code

    return jsonify({"success": True}), 200
