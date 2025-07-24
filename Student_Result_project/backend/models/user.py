from models.config import db

class User(db.Model):
    usn = db.Column(db.String(10),primary_key = True, unique = True)
    name = db.Column(db.String(100), unique = False)

    password = db.Column(db.String(8), nullable = True)