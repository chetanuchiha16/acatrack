from unittest.mock import patch
from models import StudentAuth


def test_request_reset_missing_username(client, mock_bm):
    res = client.post("/auth/forgot/request", json={})
    assert res.status_code == 422


def test_request_reset_user_not_found(client, mock_bm):
    res = client.post("/auth/forgot/request", json={"username": "NONEXISTENT"})
    assert res.status_code == 404
    assert "User not found" in res.json().get("error", "")


@patch("routes.forgot_password.send_email_async")
def test_request_reset_success(mock_send_email, client, mock_bm, db_session):
    mock_send_email.return_value = True

    student = StudentAuth(
        id=10,
        name="Bob",
        usn="1DA21CS002",
        student_email="bob@test.com",
        batch_year=2021,
        password="hash",
    )
    db_session.add(student)
    db_session.commit()

    res = client.post("/auth/forgot/request", json={"username": "1DA21CS002"})
    assert res.status_code == 200
    assert "Password reset link sent" in res.json().get("message", "")
    mock_send_email.assert_called_once()


def test_reset_password_invalid_token(client, mock_bm):
    res = client.post(
        "/auth/forgot/reset/invalid_token_123", json={"password": "NewSecretPassword1!"}
    )
    assert res.status_code == 400
    assert "Invalid token" in res.json().get("error", "")
