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
    requested_batch_year: int | None = None,
) -> None:
    """
    Enforces section-based authorization boundaries for staff/teacher queries.
    - If the user is an Admin, access is globally permitted.
    - If the user is a Teacher, they must have at least one active SubjectAssignment
      in the database for the requested section and batch year.
    - Raises a FastAPI HTTP 403 Forbidden exception if unauthorized.
    """
    payload = get_jwt_payload_from_request(request)
    if not payload:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or not logged in",
        )

    who = payload.get("who")
    if who == "Admin":
        return  # Admin bypass

    if who in ("Teacher", "Staff"):
        from fastapi import HTTPException, status

        if not requested_section_name or requested_section_name.upper() == "ALL":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must specify a section that you are assigned to teach.",
            )

        from sqlalchemy.future import select
        from models.schema import SubjectAssignment, Section

        teacher_username = payload.get("id")
        batch_year = requested_batch_year or payload.get("batch_year")

        if not teacher_username or not batch_year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session metadata",
            )

        # 1. Fetch the section ID matching name & batch year
        section_stmt = select(Section.id).where(
            Section.name == requested_section_name, Section.batch_year == batch_year
        )
        section_res = await db.execute(section_stmt)
        section_id = section_res.scalar_one_or_none()

        if not section_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section '{requested_section_name}' not found for batch {batch_year}",
            )

        # 2. Verify if the teacher has any class assignment in this section
        assign_stmt = select(SubjectAssignment.id).where(
            SubjectAssignment.teacher_username == teacher_username,
            SubjectAssignment.section_id == section_id,
            SubjectAssignment.batch_year == batch_year,
        )
        assign_res = await db.execute(assign_stmt)
        has_assignment = assign_res.scalar_one_or_none() is not None

        if not has_assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: You do not teach any classes in section '{requested_section_name}'.",
            )


async def verify_teacher_student_access(
    db, request: Request, student_usn: str, batch_year: int
) -> None:
    """
    Verifies if a teacher has authorization to view a specific student's details.
    - If the user is an Admin, access is globally permitted.
    - If the user is a Teacher/Staff, they must EITHER:
      a) Be the active Mentor for this student (matching mentor_id).
      b) Teach at least one class in the student's assigned Section (via SubjectAssignment).
    - Raises a FastAPI HTTP 403 Forbidden exception if unauthorized.
    """
    payload = get_jwt_payload_from_request(request)
    if not payload:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or not logged in",
        )

    who = payload.get("who")
    if who == "Admin":
        return  # Admin bypass

    if who in ("Teacher", "Staff"):
        from fastapi import HTTPException, status
        from sqlalchemy.future import select
        from models.schema import StudentAuth, SubjectAssignment

        teacher_username = payload.get("id")
        teacher_mentor_id = payload.get("mentor_id")

        # 1. Fetch the student's section_id and mentor_id
        stmt = select(StudentAuth.section_id, StudentAuth.mentor_id).where(
            StudentAuth.usn == student_usn, StudentAuth.batch_year == batch_year
        )
        res = await db.execute(stmt)
        student_info = res.first()

        if not student_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with USN '{student_usn}' not found in batch {batch_year}.",
            )

        section_id, student_mentor_id = student_info

        # Check A: Is this the teacher's mentee?
        if teacher_mentor_id is not None and student_mentor_id == teacher_mentor_id:
            return  # Authorized as Mentor!

        # Check B: Does the teacher teach a subject in the student's section?
        if section_id is not None:
            assign_stmt = select(SubjectAssignment.id).where(
                SubjectAssignment.teacher_username == teacher_username,
                SubjectAssignment.section_id == section_id,
                SubjectAssignment.batch_year == batch_year,
            )
            assign_res = await db.execute(assign_stmt)
            has_assignment = assign_res.scalar_one_or_none() is not None
            if has_assignment:
                return  # Authorized as Subject Teacher!

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You do not mentor this student nor teach their section.",
        )
