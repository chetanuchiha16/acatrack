from flask import Blueprint, request, jsonify
from models import StudentAuth  # your SQLAlchemy model
from app_init import db          # your DB instance
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

email_bp = Blueprint("email", __name__)

EMAIL_ADDRESS = os.getenv("EMAIL_USER", "abhishek.r0605@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASS", "ithlbwrmeyajuenr")  # Use App Password for Gmail

def send_email(to_email, subject, body):
    """Send email using Gmail SMTP."""
    msg = MIMEMultipart()
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print("Email send error:", e)
        return False


@email_bp.route("/send-email/all", methods=["POST"])
def send_email_to_all():
    data = request.get_json() or {}

    recipient_type = data.get("recipientType", "student").lower()
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Both 'subject' and 'message' are required"}), 400

    try:
        # Filter students or parents based on recipientType
        if recipient_type == "parent":
            recipients = StudentAuth.query.filter(StudentAuth.parent_email != None).all()
            email_attr = "parent_email"
            name_attr = "parent_name"  # assuming you have a parent_name field; otherwise fallback to student name
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
            # If parent_name does not exist fallback to student name
            name = getattr(person, name_attr, None) or getattr(person, "name", "Student")

            personalized_body = f"Hello {name},\n\n{message}"
            success = send_email(to_email, subject, personalized_body)
            if not success:
                failed.append(getattr(person, "usn", "unknown"))

        if failed:
            return jsonify({
                "message": "Emails sent with some failures",
                "failed_usns": failed
            }), 207  # 207 Multi-Status - partial success
        else:
            return jsonify({"message": f"Emails sent to all {recipient_type}s successfully"}), 200

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

    # Choose email and name based on recipient type
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
