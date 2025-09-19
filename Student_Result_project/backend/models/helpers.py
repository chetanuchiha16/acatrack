# helpers.py
import jwt
from flask import request, current_app

def get_jwt_payload():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    return None

def get_batch_year():
    payload = get_jwt_payload()
    return payload.get("batch_year") if payload else None

def get_user_id():
    payload = get_jwt_payload()
    return payload.get("id") if payload else None

def get_mentor_id():
    payload = get_jwt_payload()
    return payload.get("mentor_id") if payload else None

def get_who():
    payload = get_jwt_payload()
    return payload.get("who") if payload else None
