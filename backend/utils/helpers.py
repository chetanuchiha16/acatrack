import jwt
from fastapi import Request
from settings import settings
from logger_config import get_logger

logger = get_logger(__name__)


def sanitize_jwt_header(auth_header: str) -> str:
    if not auth_header:
        raise ValueError("Authorization header missing")

    if not auth_header.lower().startswith("bearer "):
        raise ValueError("Authorization header must start with 'Bearer '")

    # Remove "Bearer " prefix
    token = auth_header[len("Bearer ") :].strip()

    # Aggressively remove any quotes or whitespace around the token
    token = token.strip(" '\"")

    if not token:
        raise ValueError("JWT token is empty after sanitization")

    return token


def get_jwt_payload_from_request(request: Request) -> dict | None:
    """Extract and decode JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ")[1] if " " in auth_header else None
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("JWT expired")
        return None
    except jwt.InvalidTokenError:
        logger.debug("JWT decode error: Signature verification failed")
        return None


def get_batch_year_from_request(request: Request) -> int | None:
    payload = get_jwt_payload_from_request(request)
    return payload.get("batch_year") if payload else None


def get_user_id_from_request(request: Request) -> str | None:
    payload = get_jwt_payload_from_request(request)
    return payload.get("id") if payload else None


def get_mentor_id_from_request(request: Request) -> int | None:
    payload = get_jwt_payload_from_request(request)
    return payload.get("mentor_id") if payload else None


def get_who_from_request(request: Request) -> str | None:
    payload = get_jwt_payload_from_request(request)
    return payload.get("who") if payload else None


def decode_jwt(token: str) -> dict | None:
    """Decode a JWT token string."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except Exception:
        return None
