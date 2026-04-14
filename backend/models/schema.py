from datetime import datetime, timezone

from database import Base
from settings import settings
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship


def default_email():
    return settings.c_email


def default_number():
    return settings.default_number


# ==========================================
# ACADEMIC MODELS (Normalized)
# ==========================================


class Subject(Base):
    __tablename__ = "subjects"
    subject_code = Column(String(20), primary_key=True)
    subject_name = Column(String(100), nullable=False)
    semester = Column(String(10), nullable=False)  # e.g., 'sem1'
    credits = Column(Integer, default=0)


class AcademicResult(Base):
    __tablename__ = "academic_results"
    id = Column(Integer, primary_key=True, autoincrement=True)

    student_id = Column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    subject_code = Column(
        String(20),
        ForeignKey("subjects.subject_code", ondelete="CASCADE"),
        nullable=False,
    )
    batch_year = Column(Integer, nullable=False)

    ia_marks = Column(Integer, default=0)
    see_marks = Column(Integer, default=0)
    total_marks = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("student_id", "subject_code", name="uq_student_subject"),
    )

    subject = relationship("Subject", backref="results")


# ==========================================
# USER & AUTH MODELS (Normalized)
# ==========================================


class Mentor(Base):
    __tablename__ = "mentors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)


class StudentAuth(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, autoincrement=True)

    usn = Column(String(15), unique=True, nullable=False, index=True)

    name = Column(String(100))
    batch_year = Column(Integer, nullable=False)
    password = Column(String(128), nullable=True)
    student_email = Column(String(100), nullable=True)
    student_phno = Column(String(20), nullable=True)
    fcm_token = Column(String(256), nullable=True)

    mentor_id = Column(
        Integer, ForeignKey("mentors.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    mentor = relationship("Mentor", backref="students")
    results = relationship(
        "AcademicResult", backref="student", cascade="all, delete", lazy="selectin"
    )


class ParentAuth(Base):
    __tablename__ = "parents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(128), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    name = Column(String(100), nullable=True)
    relation = Column(String(50), nullable=True, default="Guardian")

    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    student = relationship(
        "StudentAuth",
        backref="parent_account",
    )
    fcm_token = Column(String(256), nullable=True)


class Teacher(Base):
    __tablename__ = "teachers"
    username = Column(String(20), primary_key=True, unique=True)
    mentor_id = Column(
        Integer, ForeignKey("mentors.id", ondelete="SET NULL"), nullable=True
    )
    name = Column(String(100))
    password = Column(String(128), nullable=True)
    email = Column(String(100), nullable=True, default=default_email)
    phone = Column(String(20), nullable=True, default=default_number)


class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True)
    mentor_id = Column(
        Integer, ForeignKey("mentors.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(200), nullable=False)
    agenda = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    venue = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mentor = relationship(
        "Mentor", backref="meetings"
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    usn = Column(String(15), nullable=False)
    role = Column(String(20), nullable=False)  # student, parent, teacher
    batch_year = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # naive UTC
    used = Column(Boolean, default=False)


# ---------------- Mentor Message Model ----------------
class MentorMessage(Base):
    __tablename__ = "mentor_messages"
    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("mentors.id", ondelete="CASCADE"))

    student_id = Column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True
    )
    recipient_type = Column(String)
    subject = Column(String)
    message = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    email_failed = Column(Boolean, default=False)

    mentor = relationship(
        "Mentor", backref="messages"
    )
    student = relationship(
        "StudentAuth", backref="messages"
    )

    def to_dict(self):
        dt = self.created_at
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "mentor_name": self.mentor.name if self.mentor else None,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "recipient_type": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
            "created_at": dt.isoformat(),
            "email_failed": self.email_failed,
        }


class StudentMessageStatus(Base):
    __tablename__ = "student_message_status"
    id = Column(Integer, primary_key=True)

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    msg_id = Column(
        Integer, ForeignKey("mentor_messages.id", ondelete="CASCADE")
    )
    read = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("student_id", "msg_id", name="uq_student_msg"),
    )


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)
    processed_files = Column(JSON, default=[])
    excel_url = Column(String)
    error = Column(String)
    progress = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)


class ExportCache(Base):
    __tablename__ = "export_cache"
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_year = Column(Integer, nullable=False, unique=True)
    csv_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# -----------------------------
# Message Model (store messages)
# -----------------------------
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    usn = Column(String(50), nullable=True)  # null = broadcast
    recipient_type = Column(String(20), nullable=False)  # student/parent
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "usn": self.usn,
            "recipientType": self.recipient_type,
            "subject": self.subject,
            "message": self.message,
            "createdAt": self.created_at.isoformat(),
        }
