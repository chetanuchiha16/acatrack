import sqlite3
from models.paths import db_path
from app_init import bcrypt
from models import db, User
from app_init import create_app
app = create_app()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

stus = cursor.execute("SELECT SUBJECT_CODE_USN, SUBJECT_CODE_Student_Name FROM SEM1").fetchall()

conn.commit()
cursor.close()
conn.close()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        with open("password.txt", "w") as f:
            for usn, name in stus:
                password = name[0:4] + usn[-3:]
                pw_hash = bcrypt.generate_password_hash(password=password).decode("utf-8")
                if not User.query.filter_by(usn = usn).first():
                    db.session.add(User(usn = usn, name = name, password = pw_hash))
                    f.write(f"{usn}          {name}           {password}          {pw_hash}\n")

        db.session.commit()

### use python -m utils.genpass


        

