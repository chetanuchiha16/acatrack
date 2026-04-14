from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from models import Meeting
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request
from sqlalchemy import select

router = APIRouter(prefix="/auth/Student/Mentee/meeting", tags=["mentee_meetings"])


@router.get("/{student_usn}")
async def get_mentee_meetings(student_usn: str, request: Request):
    batch_year = get_batch_year_from_request(request)
    async with bm.session_scope(batch_year) as session:
        from models.schema import StudentAuth
        result = await session.execute(
            select(StudentAuth).where(StudentAuth.usn == student_usn)
        )
        student = result.scalars().first()
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)

        if not student.mentor_id:
            return JSONResponse(content={"error": "Student has no mentor assigned"}, status_code=400)

        result = await session.execute(
            select(Meeting)
            .where(Meeting.mentor_id == student.mentor_id)
            .order_by(Meeting.date)
        )
        meetings = result.scalars().all()

        return [
            {
                "id": m.id,
                "title": m.title,
                "agenda": m.agenda,
                "date": m.date.isoformat(),
            }
            for m in meetings
        ]
