from flask import Blueprint, request, jsonify
from models import Mentor, StudentAuth
from app_init import db
from email.utils import parseaddr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timezone

mentor_email_bp = Blueprint("mentor_email", __name__)

# ---------------- Mentor Message Model ----------------
class MentorMessage(db.Model):
    __tablename__ = "mentor_messages"
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"))
    student_usn = db.Column(db.String, db.ForeignKey("students.username"), nullable=True)  # null = broadcast
    recipient_type = db.Column(db.String)  # student/parent
    subject = db.Column(db.String)
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    email_failed = db.Column(db.Boolean, default=False)

    mentor = db.relationship("Mentor", backref=db.backref("messages", lazy=True))
    student = db.relationship("StudentAuth", backref=db.backref("messages", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "mentor_name": self.mentor.name if self.mentor else None,
            "mentor_email": getattr(self.mentor, "email", None),  # optional
            "student_usn": self.student_usn,
            "student_name": self.student.name if self.student else None,
            "recipient_type": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "email_failed": self.email_failed,
        }



class StudentMessageStatus(db.Model):
    __tablename__ = "student_message_status"
    id = db.Column(db.Integer, primary_key=True)
    student_usn = db.Column(db.String(20), db.ForeignKey("students.username"))
    msg_id = db.Column(db.Integer, db.ForeignKey("mentor_messages.id"))
    read = db.Column(db.Boolean, default=False)

    __table_args__ = (db.UniqueConstraint("student_usn", "msg_id", name="uq_student_msg"),)

    def to_dict(self):
        return {"id": self.id, "student_usn": self.student_usn, "msg_id": self.msg_id, "read": self.read}


# ---------------- Email Helper ----------------
EMAIL_ADDRESS = os.getenv("EMAIL_USER", "abhishek.r0605@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS", "ithlbwrmeyajuenr")  # App password


def send_email(to_email, subject, body):
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


# ---------------- Save Message ----------------
def save_message(mentor_id, usn, recipient_type, subject, message, email_failed=False):
    mentor = Mentor.query.get(mentor_id)
    sender_info = f"\n\n--\nMessage sent by {mentor.name}"
    if hasattr(mentor, "email"):
        sender_info += f"\nEmail: {mentor.email}"
    if hasattr(mentor, "phone"):
        sender_info += f"\nPhone: {mentor.phone}"

    msg = MentorMessage(
        mentor_id=mentor_id,
        student_usn=usn,
        recipient_type=recipient_type,
        subject=subject,
        message=message + sender_info,
        email_failed=email_failed,
    )
    db.session.add(msg)
    db.session.commit()
    return msg



def serialize_message_with_read_status(msg):
    students = []
    for s in msg.mentor.students:  # now directly StudentAuth objects
        status = StudentMessageStatus.query.filter_by(student_usn=s.username, msg_id=msg.id).first()
        students.append({
            "usn": s.username,
            "name": s.name,
            "read": status.read if status else False
        })
    return {**msg.to_dict(), "read_status": students}



# ---------------- Mentor APIs ----------------
@mentor_email_bp.route("/mentor/<int:mentor_id>/students", methods=["GET"])
def get_mentor_students(mentor_id):
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404
    students = []
    for s in mentor.students:  # direct students now
        students.append({
            "usn": s.username,
            "name": s.name,
            "parent_name": s.parent_account.name if s.parent_account else None,
            "parent_email": s.parent_account.email if s.parent_account else None,
            "parent_phone": s.parent_account.phone if s.parent_account else None
        })
    return jsonify({"students": students})



@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["GET"])
def get_messages(mentor_id):
    msgs = MentorMessage.query.filter_by(mentor_id=mentor_id).order_by(MentorMessage.id.desc()).all()
    return jsonify([serialize_message_with_read_status(m) for m in msgs])


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages", methods=["POST"])
def create_message(mentor_id):
    """Store message only (no email send here)."""
    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Subject and message required"}), 400

    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    msg = save_message(mentor_id, usn, recipient_type, subject, message)
    return jsonify(serialize_message_with_read_status(msg)), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/student", methods=["POST"])
def send_email_student(mentor_id):
    data = request.get_json() or {}
    usn = data.get("usn")
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    student = StudentAuth.query.filter_by(username=usn).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if recipient_type == "parent":
        to_email = getattr(student, "parent_email", None)
        name = getattr(student, "parent_name", None) or student.name
    else:
        to_email = getattr(student, "student_email", None)
        name = student.name

    mentor = Mentor.query.get(mentor_id)
    sender_info = f"\n\n--\nMessage sent by {mentor.name} (Mentor)"
    if hasattr(mentor, "email"):
        sender_info += f"\nEmail: {mentor.email}"
    if hasattr(mentor, "phone"):
        sender_info += f"\nPhone: {mentor.phone}"

    success = send_email(to_email, subject, f"Hello {name},\n\n{message}{sender_info}")


    return jsonify({"success": success}), (200 if success else 500)


@mentor_email_bp.route("/mentor/<int:mentor_id>/send-email/all", methods=["POST"])
def send_email_all(mentor_id):
    data = request.get_json() or {}
    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    results = []
    for s in mentor.students:  # direct now
        if recipient_type == "parent":
            to_email = getattr(s.parent_account, "email", None)
            name = getattr(s.parent_account, "name", None) or s.name
        else:
            to_email = getattr(s, "student_email", None)
            name = s.name


        mentor = Mentor.query.get(mentor_id)
        sender_info = f"\n\n--\nMessage sent by {mentor.name}"
        if hasattr(mentor, "email"):
            sender_info += f"\nEmail: {mentor.email}"
        if hasattr(mentor, "phone"):
            sender_info += f"\nPhone: {mentor.phone}"

        success = send_email(to_email, subject, f"Hello {name},\n\n{message}{sender_info}")

        results.append({"usn": s.username, "success": success})

    return jsonify(results), 200


@mentor_email_bp.route("/mentor/<int:mentor_id>/messages/<int:msg_id>", methods=["DELETE"])
def delete_message(mentor_id, msg_id):
    msg = MentorMessage.query.filter_by(id=msg_id, mentor_id=mentor_id).first()
    if not msg:
        return jsonify({"error": "Message not found"}), 404

    # Delete related student statuses manually
    StudentMessageStatus.query.filter_by(msg_id=msg_id).delete()

    # Delete the message itself
    db.session.delete(msg)
    db.session.commit()
    return jsonify({"success": True})
