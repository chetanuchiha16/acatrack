from flask import Blueprint, request, jsonify
from models import Mentor, MentorStudent, StudentAuth
from app_init import db
from email.utils import parseaddr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

mentor_email_bp = Blueprint("mentor_email", __name__)

class MentorMessage(db.Model):
    __tablename__ = "mentor_messages"
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"))
    student_usn = db.Column(db.String, db.ForeignKey("students.username"), nullable=True) # null means broadcast
    recipient_type = db.Column(db.String)  # student/parent
    subject = db.Column(db.String)
    message = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "student_usn": self.student_usn,
            "recipient_type": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
        }


EMAIL_ADDRESS = os.getenv("EMAIL_USER", "abhishek.r0605@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS", "ithlbwrmeyajuenr")  # App password


def send_email(to_email, subject, body):
    """Helper: send email using Gmail SMTP."""
    if not to_email or "@" not in parseaddr(to_email)[1]:
        return False
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


# ---------------- Mentor Students ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/students", methods=["GET"])
def get_mentor_students(mentor_id):
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    students = []
    for ms in mentor.students:  # MentorStudent relation
        s = StudentAuth.query.filter_by(username=ms.student_usn).first()
        if s:
            students.append({"usn": s.username, "name": s.name})
    return jsonify({"students": students})


# ---------------- Messages ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["GET"])
def get_messages(mentor_id):
    """Fetch messages created by this mentor"""
    msgs = MentorMessage.query.filter_by(mentor_id=mentor_id).order_by(MentorMessage.id.desc()).all()
    return jsonify([m.to_dict() for m in msgs])


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(mentor_id, msg_id):
    """Delete a mentor's message"""
    msg = MentorMessage.query.filter_by(id=msg_id, mentor_id=mentor_id).first()
    if not msg:
        return jsonify({"error": "Message not found"}), 404
    db.session.delete(msg)
    db.session.commit()
    return jsonify({"message": "Message deleted"})


def save_message(mentor_id, usn, recipient_type, subject, message):
    """Helper: store message in DB"""
    msg = MentorMessage(
        mentor_id=mentor_id,
        student_usn=usn,
        recipient_type=recipient_type,
        subject=subject,
        message=message,
    )
    db.session.add(msg)
    db.session.commit()
    return msg


# ---------------- Send Email to All ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/all", methods=["POST"])
def send_email_all_mentor(mentor_id):
    data = request.get_json() or {}
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Subject and message required"}), 400

    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    failed = []
    for ms in mentor.students:
        s = StudentAuth.query.filter_by(username=ms.student_usn).first()
        if not s:
            continue

        if recipient_type == "parent":
            to_email = getattr(s, "parent_email", None)
            name = getattr(s, "parent_name", None) or s.name
        else:
            to_email = getattr(s, "student_email", None)
            name = s.name

        if not to_email:
            failed.append(s.username)
            continue

        personalized_body = f"Hello {name},\n\n{message}"
        if not send_email(to_email, subject, personalized_body):
            failed.append(s.username)

        # Save message for each student
        save_message(mentor_id, s.username, recipient_type, subject, message)

    return (
        jsonify({
            "message": f"Emails sent to all {recipient_type}s (mentor {mentor_id})",
            "failed": failed
        }),
        207 if failed else 200,
    )


# ---------------- Send Email to Individual ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/student", methods=["POST"])
def send_email_individual_mentor(mentor_id):
    data = request.get_json() or {}
    usn = data.get("usn")
    subject = data.get("subject")
    message = data.get("message")
    recipient_type = data.get("recipientType", "student").lower()

    if not usn or not subject or not message:
        return jsonify({"error": "usn, subject and message required"}), 400

    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    # check that this student belongs to the mentor
    if not any(ms.student_usn == usn for ms in mentor.students):
        return jsonify({"error": "This student is not assigned to this mentor"}), 403

    s = StudentAuth.query.filter_by(username=usn).first()
    if not s:
        return jsonify({"error": "Student not found"}), 404

    if recipient_type == "parent":
        to_email = getattr(s, "parent_email", None)
        name = getattr(s, "parent_name", None) or s.name
    else:
        to_email = getattr(s, "student_email", None)
        name = s.name

    if not to_email:
        return jsonify({"error": "No email available"}), 404

    personalized_body = f"Hello {name},\n\n{message}"
    success = send_email(to_email, subject, personalized_body)

    # Always save message, even if email fails
    save_message(mentor_id, usn, recipient_type, subject, message)

    if success:
        return jsonify({"message": f"Email sent to {recipient_type} ({usn})"}), 200
    return jsonify({"error": "Failed to send email"}), 500
