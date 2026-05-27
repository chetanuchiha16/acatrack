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


async def verify_teacher_section_access(
    db,
    request: Request,
    requested_section_name: str | None,
    requested_batch_year: int | None = None
) -> None:
    """
    Enforces section-based authorization boundaries for staff/teacher queries.
    - If the user is an Admin, access is globally permitted.
    - If the user is a Teacher, they must have at least one active SubjectAssignment
      in the database for the requested section and batch year.
    - Raises a FastAPI HTTP 403 Forbidden exception if unauthorized.
    """
    if not requested_section_name:
        return  # No specific section requested; global view allowed (e.g. university-wide calculations)

    payload = get_jwt_payload_from_request(request)
    if not payload:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or not logged in"
        )

    who = payload.get("who")
    if who == "Admin":
        return  # Admin bypass

    if who == "Teacher":
        from sqlalchemy.future import select
        from models.schema import SubjectAssignment, Section
        from fastapi import HTTPException, status

        teacher_username = payload.get("id")
        batch_year = requested_batch_year or payload.get("batch_year")

        if not teacher_username or not batch_year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session metadata"
            )

        # 1. Fetch the section ID matching name & batch year
        section_stmt = select(Section.id).where(
            Section.name == requested_section_name,
            Section.batch_year == batch_year
        )
        section_res = await db.execute(section_stmt)
        section_id = section_res.scalar_one_or_none()

        if not section_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section '{requested_section_name}' not found for batch {batch_year}"
            )

        # 2. Verify if the teacher has any class assignment in this section
        assign_stmt = select(SubjectAssignment.id).where(
            SubjectAssignment.teacher_username == teacher_username,
            SubjectAssignment.section_id == section_id,
            SubjectAssignment.batch_year == batch_year
        )
        assign_res = await db.execute(assign_stmt)
        has_assignment = assign_res.scalar_one_or_none() is not None

        if not has_assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: You do not teach any classes in section '{requested_section_name}'."
            )

