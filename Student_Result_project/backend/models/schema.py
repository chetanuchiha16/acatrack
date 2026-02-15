import os
from datetime import datetime, timezone

from extensions import db
from sqlalchemy.dialects.postgresql import JSON


def default_email():
    return os.getenv("C_EMAIL")


def default_number():
    return os.getenv("DEFAULT_NUMBER")


# ==========================================
# ACADEMIC MODELS (Normalized)
# ==========================================


class Subject(db.Model):
    __tablename__ = "subjects"
    subject_code = db.Column(db.String(20), primary_key=True)
    subject_name = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.String(10), nullable=False)  # e.g., 'sem1'
    credits = db.Column(db.Integer, default=0)


class AcademicResult(db.Model):
    __tablename__ = "academic_results"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # FIX: Changed to Integer and named student_id
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    subject_code = db.Column(
        db.String(20),
        db.ForeignKey("subjects.subject_code", ondelete="CASCADE"),
        nullable=False,
    )
    batch_year = db.Column(db.Integer, nullable=False)

    ia_marks = db.Column(db.Integer, default=0)
    see_marks = db.Column(db.Integer, default=0)
    total_marks = db.Column(db.Integer, default=0)

    # FIX: Update constraint to use student_id
    __table_args__ = (
        db.UniqueConstraint("student_id", "subject_code", name="uq_student_subject"),
    )

    subject = db.relationship("Subject", backref=db.backref("results", lazy=True))

# ==========================================
# USER & AUTH MODELS (Normalized)
# ==========================================


class Mentor(db.Model):
    __tablename__ = "mentors"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    # Optional: If Mentors are Teachers, you could link them here.


class StudentAuth(db.Model):
    __tablename__ = "students"
    # Use a surrogate key for internal database relations
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    usn = db.Column(db.String(15), unique=True, nullable=False, index=True)

    name = db.Column(db.String(100))
    batch_year = db.Column(db.Integer, nullable=False)  # Moved batch year here!
    password = db.Column(db.String(128), nullable=True)
    student_email = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(20), nullable=True)
    fcm_token = db.Column(db.String(256), nullable=True)

    mentor_id = db.Column(
        db.Integer, db.ForeignKey("mentors.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    mentor = db.relationship("Mentor", backref=db.backref("students", lazy=True))
    results = db.relationship(
        "AcademicResult", backref="student", cascade="all, delete", lazy=True
    )


class ParentAuth(db.Model):
    __tablename__ = "parents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    name = db.Column(db.String(100), nullable=True)
    relation = db.Column(db.String(50), nullable=True, default="Guardian")

    # FIX: Changed to Integer and named student_id
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    student = db.relationship(
        "StudentAuth",
        backref=db.backref("parent_account", uselist=False, cascade="all, delete"),
    )
    fcm_token = db.Column(db.String(256), nullable=True)


class Teacher(db.Model):
    __tablename__ = "teachers"
    username = db.Column(db.String(20), primary_key=True, unique=True)
    mentor_id = db.Column(
        db.Integer, db.ForeignKey("mentors.id", ondelete="SET NULL"), nullable=True
    )
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)
    email = db.Column(db.String(100), nullable=True, default=default_email)
    phone = db.Column(db.String(20), nullable=True, default=default_number)


class Meeting(db.Model):
    __tablename__ = "meetings"
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(
        db.Integer, db.ForeignKey("mentors.id", ondelete="CASCADE"), nullable=False
    )  # Added proper FK
    title = db.Column(db.String(200), nullable=False)
    agenda = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    mentor = db.relationship(
        "Mentor", backref=db.backref("meetings", cascade="all, delete", lazy=True)
    )


# (Keep PasswordResetToken, MentorMessage, StudentMessageStatus, Job mostly the same, just ensure they point to `students.id` instead of `students.username`)


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    # Inside PasswordResetToken
    usn = db.Column(db.String(15), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student, parent, teacher
    batch_year = db.Column(db.Integer, nullable=False)  # NEW FIELD
    expires_at = db.Column(db.DateTime, nullable=False)  # naive UTC
    used = db.Column(db.Boolean, default=False)


# ---------------- Mentor Message Model ----------------
class MentorMessage(db.Model):
    __tablename__ = "mentor_messages"
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id", ondelete="CASCADE"))
    
    # FIX: Changed to Integer and named student_id
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=True
    )
    recipient_type = db.Column(db.String)
    subject = db.Column(db.String)
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    email_failed = db.Column(db.Boolean, default=False)

    mentor = db.relationship("Mentor", backref=db.backref("messages", lazy=True, cascade="all, delete"))
    student = db.relationship("StudentAuth", backref=db.backref("messages", lazy=True, cascade="all, delete"))

    def to_dict(self):
        dt = self.created_at
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "mentor_name": self.mentor.name if self.mentor else None,
            "student_id": self.student_id,  # FIX
            "student_name": self.student.name if self.student else None,
            "recipient_type": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
            "created_at": dt.isoformat(),
            "email_failed": self.email_failed,
        }

class StudentMessageStatus(db.Model):
    __tablename__ = "student_message_status"
    id = db.Column(db.Integer, primary_key=True)
    
    # FIX: Changed to Integer and named student_id
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE")
    )
    msg_id = db.Column(
        db.Integer, db.ForeignKey("mentor_messages.id", ondelete="CASCADE")
    )
    read = db.Column(db.Boolean, default=False)
    
    # FIX: Update constraint
    __table_args__ = (
        db.UniqueConstraint("student_id", "msg_id", name="uq_student_msg"),
    )


class Job(db.Model):
    __tablename__ = "jobs"
    id = db.Column(db.String, primary_key=True)
    status = db.Column(db.String, nullable=False)
    processed_files = db.Column(JSON, default=[])
    excel_url = db.Column(db.String)
    error = db.Column(db.String)
    progress = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
