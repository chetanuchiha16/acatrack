# mentor_meetings.py
from flask import Blueprint, request, jsonify
from models import db, Meeting
from datetime import datetime

mentor_meetings_bp = Blueprint("mentor_meetings", __name__, url_prefix="/auth/Staff/Mentor/meeting/")

# Get all meetings for a mentor
@mentor_meetings_bp.route("<int:mentor_id>", methods=["GET"])
def get_meetings(mentor_id):
    meetings = Meeting.query.filter_by(mentor_id=mentor_id).order_by(Meeting.date).all()
    result = [
        {
            "id": m.id,
            "title": m.title,
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
    agenda = data.get("agenda")
    date_str = data.get("date")

    if not title or not date_str:
        return jsonify({"error": "Title and date are required"}), 400

    try:
        meeting_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    meeting = Meeting(mentor_id=mentor_id, title=title, agenda=agenda, date=meeting_date)
    db.session.add(meeting)
    db.session.commit()

    return jsonify({"message": "Meeting added successfully", "id": meeting.id}), 201

# Delete a meeting
@mentor_meetings_bp.route("delete/<int:meeting_id>", methods=["DELETE"])
def delete_meeting(meeting_id):
    meeting = Meeting.query.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404

    db.session.delete(meeting)
    db.session.commit()
    return jsonify({"message": "Meeting deleted successfully"})
