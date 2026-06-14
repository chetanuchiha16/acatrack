from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request

router = APIRouter(prefix="/auth/Student/Mentee/meeting", tags=["mentee_meetings"])


@router.get("/{student_usn}")
async def get_mentee_meetings(student_usn: str, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        from repositories.student_repository import StudentRepository
        from repositories.mentor_repository import MentorRepository

        student_repo = StudentRepository(session)
        student = await student_repo.get_auth_by_usn(student_usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        if not student.mentor_id:
            return JSONResponse(
                content={"error": "Student has no mentor assigned"}, status_code=400
            )

        mentor_repo = MentorRepository(session)
        meetings = await mentor_repo.get_meetings_by_mentor(student.mentor_id)

        return [
            {
                "id": m.id,
                "title": m.title,
                "agenda": m.agenda,
                "date": m.date.isoformat(),
            }
            for m in meetings
        ]
