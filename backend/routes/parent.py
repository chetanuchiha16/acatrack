from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from repositories.parent_repository import ParentRepository
from repositories.mentor_repository import MentorRepository
from services.batch_manager import bm
from utils.helpers import (
    get_batch_year_from_request,
    get_jwt_payload_from_request,
    get_user_id_from_request,
)

router = APIRouter(tags=["parent"])


@router.get("/parent/student-details")
async def get_student_details(request: Request):
    payload = get_jwt_payload_from_request(request)
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        if not payload or payload.get("who") != "Parent":
            return JSONResponse(content={"error": "Unauthorized"}, status_code=403)

        parent_repo = ParentRepository(session)
        parent = await parent_repo.get_auth_by_username(
            get_user_id_from_request(request)
        )
        if not parent or not parent.student:
            return JSONResponse(
                content={"error": "Student not linked"}, status_code=404
            )

        student = parent.student
        mentor = student.mentor

        teacher = None
        if mentor:
            mentor_repo = MentorRepository(session)
            teacher = await mentor_repo.get_teacher_by_mentor_id(mentor.id)

        return {
            "student": {
                "usn": student.usn,
                "name": student.name,
                "email": student.student_email,
                "phone": student.student_phno,
            },
            "mentor": {
                "id": mentor.id,
                "name": mentor.name,
                "email": teacher.email if teacher else None,
                "phone": teacher.phone if teacher else None,
            }
            if mentor
            else None,
        }
