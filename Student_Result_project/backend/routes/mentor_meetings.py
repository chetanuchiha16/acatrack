# mentor_meetings.py
from flask import Blueprint, request, jsonify, session
from models import db, Meeting
from datetime import datetime
from .mentor_send_email import send_email
from repositories.mentor_repository import MentorRepository
mentor_meetings_bp = Blueprint("mentor_meetings", __name__, url_prefix="/auth/Staff/Mentor/meeting/")
from models.batch_manager import BatchManager, bm
from models.helpers import get_batch_year
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
                "date": m.date.isoformat()
            } for m in meetings
        ]
        return jsonify(result)

# Add a new meeting
@mentor_meetings_bp.route("<int:mentor_id>", methods=["POST"])
def add_meeting(mentor_id):
    data = request.get_json()
    title = data.get("title")
    venue = data.get("venue")
    agenda = data.get("agenda")
    date_str = data.get("date")

    if not title or not date_str:
        return jsonify({"error": "Title and date are required"}), 400

    try:
        meeting_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    batch_year = request.args.get("batch_year") or get_batch_year()
    with bm.session_scope(batch_year) as db:
        meeting = Meeting(mentor_id=mentor_id, title=title, venue = venue, agenda=agenda, date=meeting_date)
        db.session.add(meeting)
        db.session.commit()

        # ---------------- Send email to all students ----------------
        from models import Mentor, StudentAuth  # ensure these are imported
        mentor_repo = MentorRepository(db.session)
        mentor = mentor_repo.get_by_id(mentor_id)
        if mentor:
            subject = f"New Meeting Scheduled: {title}"
            body = f"""Hello,

            A new meeting has been scheduled by {mentor.name}.

            Title: {title}
            Agenda: {agenda}
            Date: {meeting_date.strftime('%Y-%m-%d')}
            Venue: {venue}

            Please attend on time."""


            # Send to each student
            for s in mentor.students:  # direct students
                to_email = getattr(s, "student_email", None)
                if to_email:
                    send_email(to_email, subject, body)

        return jsonify({"message": "Meeting added successfully and emails sent", "id": meeting.id}), 201


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
