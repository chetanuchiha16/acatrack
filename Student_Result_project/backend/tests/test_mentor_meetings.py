from unittest.mock import patch
from models import Mentor, StudentAuth, Meeting
from datetime import date

def test_add_meeting_missing_data(client, mock_bm):
    res = client.post("/auth/Staff/Mentor/meeting/1", json={
        "venue": "Room 101",
        "date": "2023-10-10",
        "agenda": "Review"
    })
    assert res.status_code == 422
    assert "validation failed" in res.get_json().get("error", "").lower()

def test_add_meeting_invalid_date(client, mock_bm):
    res = client.post("/auth/Staff/Mentor/meeting/1?batch_year=2023", json={
        "title": "Weekly Sync",
        "date": "10-10-2023" # invalid format
    })
    assert res.status_code == 422
    assert "validation failed" in res.get_json().get("error", "").lower()

@patch("routes.mentor_meetings.send_email_async")
def test_add_meeting_success(mock_send_email, client, mock_bm, app):
    mock_send_email.return_value = True

    # Setup the DB with a mentor and a student
    from extensions import db as real_db
    with app.app_context():
        mentor = Mentor(id=1, name="John Doe")
        student = StudentAuth(id=1, name="Alice", usn="1DA20CS001", student_email="alice@test.com", batch_year=2023, mentor_id=1, password="hash")
        real_db.session.add(mentor)
        real_db.session.add(student)
        real_db.session.commit()

    res = client.post("/auth/Staff/Mentor/meeting/1?batch_year=2023", json={
        "title": "Weekly Sync",
        "venue": "Room 101",
        "date": "2023-10-10",
        "agenda": "Review"
    })
    
    assert res.status_code == 201
    assert res.get_json().get("message") == "Meeting added and emails sent to all students"
    mock_send_email.assert_called_once()

def test_get_meetings(client, mock_bm, app):
    from extensions import db as real_db
    with app.app_context():
        # Clear previous records if any (sqlite in-memory persists across tests unless scoped)
        real_db.session.query(Meeting).delete()
        meeting = Meeting(mentor_id=1, title="Past Sync", date=date(2023, 10, 1), venue="Lab", agenda="")
        real_db.session.add(meeting)
        real_db.session.commit()

    res = client.get("/auth/Staff/Mentor/meeting/1?batch_year=2023")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 1
    assert data[0]["title"] == "Past Sync"
