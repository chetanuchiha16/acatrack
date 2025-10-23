from app_init import db
from datetime import datetime, timezone
import os
def default_email():
    return os.getenv("C_EMAIL")
def default_number():
    return os.getenv("DEFAULT_NUMBER")
class StudentAuth(db.Model):
    __tablename__ = 'students'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)
    student_email = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(20), nullable=True)

    fcm_token = db.Column(db.String(256), nullable=True)

    # Link to mentor (one-to-many)
    mentor_id = db.Column(
        db.Integer,
        db.ForeignKey("mentors.id", ondelete="SET NULL"),  # if mentor deleted, student stays
        nullable=True
    )
    mentor = db.relationship("Mentor", backref=db.backref("students", lazy=True, cascade="all, delete"))



class ParentAuth(db.Model):
    __tablename__ = "parents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    name = db.Column(db.String(100), nullable=True)
    relation = db.Column(db.String(50), nullable=True, default="Guardian")

    student_usn = db.Column(
        db.String(10),
        db.ForeignKey("students.username", ondelete="CASCADE"),  # 👈 delete parent if student deleted
        nullable=False,
        unique=True
    )
    student = db.relationship(
        "StudentAuth",
        backref=db.backref("parent_account", uselist=False, cascade="all, delete"),
        passive_deletes=True
    )

    fcm_token = db.Column(db.String(256), nullable=True)



class Teacher(db.Model):
    __tablename__ = 'teachers'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    mentor_id = db.Column(
        db.Integer,
        db.ForeignKey('mentors.id', name='fk_teachers_mentor_id', ondelete="SET NULL"),
        nullable=True
    )
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)
    email = db.Column(db.String(100), nullable=True, default=default_email)
    phone = db.Column(db.String(20), nullable=True, default=default_number)



class Mentor(db.Model):
    __tablename__ = 'mentors'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)


class Meeting(db.Model):
    __tablename__ = 'meetings'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    agenda = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    usn = db.Column(db.String(10), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student, parent, teacher
    batch_year = db.Column(db.Integer, nullable=False)  # NEW FIELD
    expires_at = db.Column(db.DateTime, nullable=False)  # naive UTC
    used = db.Column(db.Boolean, default=False)


# ---------------- Mentor Message Model ----------------
class MentorMessage(db.Model):
    __tablename__ = "mentor_messages"
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id", ondelete="CASCADE"))
    student_usn = db.Column(db.String, db.ForeignKey("students.username", ondelete="CASCADE"), nullable=True)
    recipient_type = db.Column(db.String)
    subject = db.Column(db.String)
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    email_failed = db.Column(db.Boolean, default=False)

    mentor = db.relationship("Mentor", backref=db.backref("messages", lazy=True, cascade="all, delete"))
    student = db.relationship("StudentAuth", backref=db.backref("messages", lazy=True, cascade="all, delete"))

    def to_dict(self):
        dt = self.created_at
        if dt and dt.tzinfo is None:  # SQLite returned naive
            dt = dt.replace(tzinfo=timezone.utc)
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
            "created_at": dt.isoformat(),  # now ends with +00:00
            "email_failed": self.email_failed,
        }



class StudentMessageStatus(db.Model):
    __tablename__ = "student_message_status"
    id = db.Column(db.Integer, primary_key=True)
    student_usn = db.Column(
        db.String(20),
        db.ForeignKey("students.username", ondelete="CASCADE")
    )
    msg_id = db.Column(
        db.Integer,
        db.ForeignKey("mentor_messages.id", ondelete="CASCADE")
    )
    read = db.Column(db.Boolean, default=False)
    __table_args__ = (db.UniqueConstraint("student_usn", "msg_id", name="uq_student_msg"),)
