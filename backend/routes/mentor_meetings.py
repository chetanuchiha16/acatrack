from datetime import datetime

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request
from pydantic import BaseModel, Field, field_validator
from repositories.mentor_repository import MentorRepository
from routes.send_email import send_email_async
from repositories.student_repository import StudentRepository

router = APIRouter(prefix="/auth/Staff/Mentor/meeting", tags=["mentor_meetings"])


class AddMeetingRequest(BaseModel):
    title: str = Field(..., min_length=1)
    date: str = Field(...)
    venue: str | None = None
    agenda: str | None = None

    @field_validator("date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")
        return v


@router.get("/{mentor_id}")
async def get_meetings(
    mentor_id: int, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        meetings = await mentor_repo.get_meetings_by_mentor(mentor_id)
        return [
            {
                "id": m.id,
                "title": m.title,
                "venue": m.venue,
                "agenda": m.agenda,
                "date": m.date.isoformat(),
            }
            for m in meetings
        ]


@router.post("/{mentor_id}", status_code=201)
async def add_meeting(
    mentor_id: int,
    body: AddMeetingRequest,
    request: Request,
    batch_year: int | None = Query(None),
):
    meeting_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    by = batch_year or get_batch_year_from_request(request)

    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        meeting = await mentor_repo.create_meeting(
            mentor_id=mentor_id,
            title=body.title,
            venue=body.venue,
            agenda=body.agenda,
            date=meeting_date,
        )
        meeting_id = meeting.id

        # Send email to all students
        mentor = await mentor_repo.get_by_id(mentor_id)
        if mentor:
            subject = f"New Meeting Scheduled: {body.title}"
            email_body = f"""Hello,

            A new meeting has been scheduled by {mentor.name}.

            Title: {body.title}
            Date: {meeting_date}
            Venue: {body.venue}
            Agenda: {body.agenda}

            Please be present on time.

            --
            Message sent by {mentor.name} (Mentor)
            """

            student_repo = StudentRepository(session)
            students = await student_repo.get_mentees_by_mentor(mentor_id)
            for student in students:
                to_email = getattr(student, "student_email", None)
                if to_email:
                    send_email_async(to_email, subject, email_body)

        await session.commit()

    return {
        "message": "Meeting added and emails sent to all students",
        "id": meeting_id,
    }


@router.delete("/delete/{meeting_id}")
async def delete_meeting(
    meeting_id: int, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        mentor_repo = MentorRepository(session)
        meeting = await mentor_repo.get_meeting_by_id(meeting_id)
        if not meeting:
            return JSONResponse(content={"error": "Meeting not found"}, status_code=404)

        await mentor_repo.delete_meeting(meeting)
        await session.commit()
        return {"message": "Meeting deleted successfully"}
