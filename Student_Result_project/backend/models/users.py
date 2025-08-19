from app_init import db

class User(db.Model):
    __tablename__ = 'users'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)   # use larger length for bcrypt hashes


class Teacher(db.Model):
    __tablename__ = 'teachers'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)


class StudentEmail(db.Model):
    __tablename__ = 'student_emails'   # fixed from _tablename_
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usn = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    parent_email = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(100), nullable=False)
    parent_phno = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(100), nullable=True)
    


class Mentor(db.Model):
    __tablename__ = 'mentors'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)


class MentorStudent(db.Model):
    __tablename__ = 'mentor_students'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    student_usn = db.Column(db.String(50), db.ForeignKey('student_emails.usn'), nullable=False)

    # Relationships
    mentor = db.relationship('Mentor', backref=db.backref('students', lazy=True))
    student = db.relationship('StudentEmail', backref=db.backref('mentors', lazy=True))
