from app import app
from models import StudentAuth

with app.app_context():
    mentees = StudentAuth.query.filter_by(mentor_id=1, batch_year=2023).all()
    print("Mentees for mentor 1, batch 2023:", [(m.usn, m.name) for m in mentees])
