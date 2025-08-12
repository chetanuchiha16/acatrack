from app_init import db

class User(db.Model):
    username = db.Column(db.String(10),primary_key = True, unique = True)
    name = db.Column(db.String(100), unique = False)

    password = db.Column(db.String(8), nullable = True)

class Teacher(db.Model):
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(8), nullable=True)

class StudentEmail(db.Model):
    _tablename_ = 'student_emails'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usn = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    parent_email = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(100), nullable=False)