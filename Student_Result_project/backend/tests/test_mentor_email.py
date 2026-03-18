from unittest.mock import patch
from models import Mentor, StudentAuth

def test_send_message_missing_data(client, mock_bm, app):
    from extensions import db as real_db
    with app.app_context():
        mentor = Mentor(id=1, name="John Doe")
        student = StudentAuth(id=1, name="Alice", usn="1DA20CS001", student_email="alice@test.com", batch_year=2023, mentor_id=1, password="hash")
        real_db.session.add(mentor)
        real_db.session.add(student)
        real_db.session.commit()

    # Missing subject/message
    res = client.post("/mentor/1/send-email/student?batch_year=2023", json={
        "usn": "1DA20CS001"
    })
    assert res.status_code == 422
    assert "validation failed" in res.get_json().get("error", "").lower()

@patch("routes.mentor_send_email.send_email_async")
def test_send_message_student_not_found(mock_send_email, client, mock_bm, app):
    res = client.post("/mentor/1/send-email/student?batch_year=2023", json={
        "usn": "NONEXISTENT",
        "subject": "Test",
        "message": "Hello"
    })
    assert res.status_code == 404
    assert "Student not found" in res.get_json().get("error", "")

@patch("routes.mentor_send_email.send_email_async")
def test_send_message_success(mock_send_email, client, mock_bm, app):
    mock_send_email.return_value = True

    from extensions import db as real_db
    with app.app_context():
        mentor = Mentor(id=1, name="John Doe")
        student = StudentAuth(id=1, name="Alice", usn="1DA20CS001", student_email="alice@test.com", batch_year=2023, mentor_id=1, password="hash")
        real_db.session.add(mentor)
        real_db.session.add(student)
        real_db.session.commit()

    res = client.post("/mentor/1/send-email/student?batch_year=2023", json={
        "usn": "1DA20CS001",
        "subject": "Important Update",
        "message": "Please review your marks."
    })
    
    assert res.status_code == 200
    assert res.get_json() == {"success": True}
    mock_send_email.assert_called_once()
