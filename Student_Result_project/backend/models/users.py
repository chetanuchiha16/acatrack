from app_init import db
from datetime import datetime, timezone
class StudentAuth(db.Model):
    __tablename__ = 'students'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)   # bcrypt hash
    student_email = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(20), nullable=True)

    # Link to mentor (one-to-many: one mentor, many students)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"), nullable=True)
    mentor = db.relationship("Mentor", backref=db.backref("students", lazy=True))


class ParentAuth(db.Model):
    __tablename__ = "parents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Credentials
    username = db.Column(db.String(10), unique=True, nullable=False)
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
    email = db.Column(db.String(100), nullable=True, default = f"chetan16ck@gmaail.com")
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