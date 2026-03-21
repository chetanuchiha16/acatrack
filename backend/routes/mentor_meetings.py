# mentor_meetings.py
from datetime import datetime

from flask import Blueprint, jsonify, request
from models import Meeting
from services.batch_manager import bm
from utils.helpers import get_batch_year
from pydantic import BaseModel, Field, field_validator
from repositories.mentor_repository import MentorRepository
from routes.send_email import send_email_async

mentor_meetings_bp = Blueprint(
    "mentor_meetings", __name__, url_prefix="/auth/Staff/Mentor/meeting/"
)


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


# Get all meetings for a mentor
@mentor_meetings_bp.route("<int:mentor_id>", methods=["GET"])
def get_meetings(mentor_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        meetings = mentor_repo.get_meetings_by_mentor(mentor_id)
        result = [
            {
                "id": m.id,
                "title": m.title,
                "venue": m.venue,
                "agenda": m.agenda,
                "date": m.date.isoformat(),
            }
            for m in meetings
        ]
        return jsonify(result)


# Add a new meeting
@mentor_meetings_bp.route("<int:mentor_id>", methods=["POST"])
def add_meeting(mentor_id):
    validated_data = AddMeetingRequest.model_validate(request.get_json() or {})
    title = validated_data.title
    venue = validated_data.venue
    agenda = validated_data.agenda
    meeting_date = datetime.strptime(validated_data.date, "%Y-%m-%d").date()

    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        meeting = Meeting(
            mentor_id=mentor_id,
            title=title,
            venue=venue,
            agenda=agenda,
            date=meeting_date,
        )
        db.session.add(meeting)
        db.session.commit()

        meeting_id = meeting.id

        # ---------------- Send email to all students ----------------
        from models import StudentAuth  # ensure these are imported

        mentor_repo = MentorRepository(db.session)
        mentor = mentor_repo.get_by_id(mentor_id)
        if mentor:
            subject = f"New Meeting Scheduled: {title}"
            body = f"""Hello,

            A new meeting has been scheduled by {mentor.name}.

            Title: {title}
            Date: {meeting_date}
            Venue: {venue}
            Agenda: {agenda}

            Please be present on time.

            --
            Message sent by {mentor.name} (Mentor)
            """

            # Using list comprehension with session scope directly
            students = (
                db.session.query(StudentAuth).filter_by(mentor_id=mentor_id).all()
            )
            for student in students:
                to_email = getattr(student, "student_email", None)
                if to_email:
                    send_email_async(to_email, subject, body)

    return jsonify(
        {"message": "Meeting added and emails sent to all students", "id": meeting_id}
    ), 201


# Delete a meeting
@mentor_meetings_bp.route("delete/<int:meeting_id>", methods=["DELETE"])
def delete_meeting(meeting_id):
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        mentor_repo = MentorRepository(db.session)
        meeting = mentor_repo.get_meeting_by_id(meeting_id)
        if not meeting:
            return jsonify({"error": "Meeting not found"}), 404

        db.session.delete(meeting)
        db.session.commit()
        return jsonify({"message": "Meeting deleted successfully"})
