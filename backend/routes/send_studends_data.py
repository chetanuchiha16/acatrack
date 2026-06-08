import base64

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, FileResponse
from schemas import StudentResultResponse
from cache_config import cache
from logger_config import get_logger
from services.student_service import Student
from utils.helpers import get_batch_year_from_request
from services.batch_manager import bm
from models.paths import pdf_dir
from visuals import create_student_report

logger = get_logger(__name__)

router = APIRouter(tags=["student"])


@router.get("/auth/Student/result", response_model=StudentResultResponse)
@cache(expire=3600)
async def get_student_info(
    request: Request, usn: str = Query(None), semester: str = Query(None)
):
    batch_year = get_batch_year_from_request(request)


    try:
        import asyncio

        async with bm.session_scope(batch_year) as session:
            student = await Student.create_async(
                session, usn=usn, semester=semester, batch_year=batch_year
            )
            if student and getattr(student, "found", True):
                from repositories.student_repository import StudentRepository

                repo = StudentRepository(session)
                student_rec = await repo.get_auth_by_usn(usn)
                if student_rec:
                    available_sems = await repo.get_semesters_with_results(
                        student_rec.id
                    )
                else:
                    available_sems = [semester] if semester else ["sem1"]
            else:
                available_sems = [semester] if semester else ["sem1"]

        if not getattr(student, "found", True):
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        if not available_sems:
            available_sems = [semester] if semester else ["sem1"]

        pdf_bytes = await asyncio.get_event_loop().run_in_executor(
            None, create_student_report, student
        )
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        pdf_url = f"data:application/pdf;base64,{pdf_base64}"

        response_data = student.to_dict()
        response_data["pdf_url"] = pdf_url
        response_data["available_semesters"] = available_sems

        return response_data

    except Exception:
        logger.exception(f"Error fetching student result for USN: {usn}")
        return JSONResponse(
            content={"error": "Failed to fetch student result."}, status_code=500
        )


@router.get("/auth/Student/report/{filename}")
async def download_report(filename: str):
    import os
    from pathlib import Path

    safe_filename = Path(filename).name  # prevent path traversal
    filepath = os.path.join(pdf_dir, safe_filename)
    if not os.path.exists(filepath):
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    return FileResponse(filepath, filename=safe_filename, media_type="application/pdf")


@router.get("/auth/Student/details")
async def get_student_profile(request: Request):
    from utils.helpers import get_jwt_payload_from_request

    payload = get_jwt_payload_from_request(request)
    batch_year = get_batch_year_from_request(request)
    if not payload or payload.get("who") != "Student":
        return JSONResponse(content={"error": "Unauthorized"}, status_code=403)

    usn = payload.get("id")
    try:
        async with bm.session_scope(batch_year) as session:
            from repositories.student_repository import StudentRepository
            from repositories.mentor_repository import MentorRepository

            repo = StudentRepository(session)
            student_rec = await repo.get_auth_by_usn(usn)
            if not student_rec:
                return JSONResponse(
                    content={"error": "Student not found"}, status_code=404
                )

            mentor = student_rec.mentor
            teacher = None
            if mentor:
                mentor_repo = MentorRepository(session)
                teacher = await mentor_repo.get_teacher_by_mentor_id(mentor.id)

            return {
                "student": {
                    "usn": student_rec.usn,
                    "name": student_rec.name,
                    "email": student_rec.student_email,
                    "phone": student_rec.student_phno,
                },
                "mentor": {
                    "id": mentor.id,
                    "name": teacher.name if teacher else mentor.name,
                    "email": teacher.email if teacher else None,
                    "phone": teacher.phone if teacher else None,
                }
                if mentor
                else None,
            }
    except Exception:
        logger.exception("Error in get_student_profile")
        return JSONResponse(
            content={"error": "Failed to fetch student profile"}, status_code=500
        )
