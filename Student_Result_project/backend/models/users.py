from app_init import db
from datetime import datetime, timezone
class StudentAuth(db.Model):
    __tablename__ = 'students'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)   # bcrypt hash
    student_email = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(20), nullable=True)

    # NEW: store latest Firebase device token
    fcm_token = db.Column(db.String(256), nullable=True)

    # Link to mentor (one-to-many: one mentor, many students)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"), nullable=True)
    mentor = db.relationship("Mentor", backref=db.backref("students", lazy=True))


class ParentAuth(db.Model):
    __tablename__ = "parents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Credentials
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

    # Contact info
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)

    # Relation info
    name = db.Column(db.String(100), nullable=True)   # actual parent name if available
    relation = db.Column(db.String(50), nullable=True, default="Guardian")  # Father/Mother/Guardian

    # Link to student (one parent per student account)
    student_usn = db.Column(
        db.String(10),
        db.ForeignKey("students.username"),
        nullable=False,
        unique=True
    )
    student = db.relationship("StudentAuth", backref=db.backref("parent_account", uselist=False))

    fcm_token = db.Column(db.String(256), nullable=True)


class Teacher(db.Model):
    __tablename__ = 'teachers'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    mentor_id = db.Column(
        db.Integer,
        db.ForeignKey('mentors.id', name='fk_teachers_mentor_id'),  # give it a name
        nullable=True
    )
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)

    # Contact info
    email = db.Column(db.String(100), nullable=True, default = f"chetan16ck@gmail.com")
    phone = db.Column(db.String(20), nullable=True, default = "123456789")


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
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"))
    student_usn = db.Column(db.String, db.ForeignKey("students.username"), nullable=True)  # null = broadcast
    recipient_type = db.Column(db.String)  # student/parent
    subject = db.Column(db.String)
    message = db.Column(db.Text)
    created_at = db.Column(
        db.DateTime,  
        default=lambda: datetime.now(timezone.utc)
    )

    email_failed = db.Column(db.Boolean, default=False)

    mentor = db.relationship("Mentor", backref=db.backref("messages", lazy=True))
    student = db.relationship("StudentAuth", backref=db.backref("messages", lazy=True))

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
    student_usn = db.Column(db.String(20), db.ForeignKey("students.username"))
    msg_id = db.Column(db.Integer, db.ForeignKey("mentor_messages.id"))
    read = db.Column(db.Boolean, default=False)

    __table_args__ = (db.UniqueConstraint("student_usn", "msg_id", name="uq_student_msg"),)

    def to_dict(self):
        return {"id": self.id, "student_usn": self.student_usn, "msg_id": self.msg_id, "read": self.read}