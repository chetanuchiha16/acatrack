from flask import Blueprint, request, jsonify
from models import StudentAuth  # your existing model
from app_init import db          # your DB instance
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timezone

email_bp = Blueprint("email", __name__)

EMAIL_ADDRESS = os.getenv("EMAIL_USER", "abhishek.r0605@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS", "ithlbwrmeyajuenr")  # Gmail App Password


# -----------------------------
# Message Model (store messages)
# -----------------------------
class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    usn = db.Column(db.String(50), nullable=True)  # null = broadcast
    recipient_type = db.Column(db.String(20), nullable=False)  # student/parent
    subject = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "usn": self.usn,
            "recipientType": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
            "createdAt": self.created_at.isoformat(),
        }


# -----------------------------
# Email Sending Utility
# -----------------------------
def send_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print("Email send error:", e)
        return False


# -----------------------------
# Email Endpoints
# -----------------------------
@email_bp.route("/send-email/all", methods=["POST"])
def send_email_to_all():
    data = request.get_json() or {}

    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Both 'subject' and 'message' are required"}), 400

    try:
        if recipient_type == "parent":
            recipients = StudentAuth.query.filter(StudentAuth.parent_email != None).all()
            email_attr = "parent_email"
            name_attr = "parent_name"
        else:
            recipients = StudentAuth.query.all()
            email_attr = "student_email"
            name_attr = "name"

        failed = []
        for person in recipients:
            to_email = getattr(person, email_attr, None)
            if not to_email:
                failed.append(getattr(person, "usn", "unknown"))
                continue

            name = getattr(person, name_attr, None) or getattr(person, "name", "Student")
            personalized_body = f"Hello {name},\n\n{message}"
            success = send_email(to_email, subject, personalized_body)
            if not success:
                failed.append(getattr(person, "usn", "unknown"))

        return jsonify({
            "message": f"Emails sent to all {recipient_type}s",
            "failed_usns": failed
        }), (207 if failed else 200)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@email_bp.route("/send-email/student", methods=["POST"])
def send_email_to_student():
    data = request.get_json()
    usn = data.get("usn")
    subject = data.get("subject")
    message = data.get("message")
    recipient_type = data.get("recipientType", "student").lower()

    if not usn or not subject or not message:
        return jsonify({"error": "USN, subject and message are required"}), 400

    student = StudentAuth.query.filter_by(username=usn).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if recipient_type == "parent":
        to_email = getattr(student, "parent_email", None)
        name = getattr(student, "parent_name", None) or student.name
        if not to_email:
            return jsonify({"error": "Parent email not found for this student"}), 404
    else:
        to_email = student.student_email
        name = student.name

    personalized_body = f"Hello {name},\n\n{message}"

    try:
        success = send_email(to_email, subject, personalized_body)
        if success:
            return jsonify({"message": f"Email sent to {recipient_type} with USN {usn}"}), 200
        else:
            return jsonify({"error": "Failed to send email"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# Message CRUD Endpoints
# -----------------------------
@email_bp.route("/messages", methods=["POST"])
def save_message():
    data = request.get_json() or {}
    new_msg = Message(
        usn=data.get("usn"),
        recipient_type=data.get("recipientType"),
        subject=data.get("subject"),
        message=data.get("message"),
    )
    db.session.add(new_msg)
    db.session.commit()
    return jsonify(new_msg.to_dict()), 201


@email_bp.route("/messages", methods=["GET"])
def get_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    return jsonify([m.to_dict() for m in messages]), 200


@email_bp.route("/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(msg_id):
    msg = Message.query.get_or_404(msg_id)
    db.session.delete(msg)
    db.session.commit()
    return jsonify({"message": "Message deleted"}), 200
