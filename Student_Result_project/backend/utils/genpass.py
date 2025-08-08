import sqlite3
from models.paths import db_path
from app_init import bcrypt
from models import db, User, Teacher
from app_init import create_app
app = create_app()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

techers = cursor.execute("SELECT SEM1_Staff_Initials FROM Subjectwise_result_1").fetchall()
stus = cursor.execute("SELECT SUBJECT_CODE_USN, SUBJECT_CODE_Student_Name FROM SEM1").fetchall()

conn.commit()
cursor.close()
conn.close()

import random
import string

if __name__ == "__main__":
    # with app.app_context():
    #     db.create_all()
    #     with open("password.txt", "w") as f:
    #         for username, name in stus:
    #             password = name[0:4] + username[-3:]
    #             pw_hash = bcrypt.generate_password_hash(password=password).decode("utf-8")
    #             if not User.query.filter_by(username = username).first():
    #                 db.session.add(User(username = username, name = name, password = pw_hash))
    #                 f.write(f"{username}          {name}           {password}          {pw_hash}\n")

    #     db.session.commit()

    with app.app_context():
        db.create_all()
        with open("password_teacher.txt", "w") as f:
            for (teacher_name,) in techers:  # tuple unpacking
                username = str(random.randint(10000000, 99999999))
                password = teacher_name[0:4] + username[-3:]
                pw_hash = bcrypt.generate_password_hash(password=password).decode("utf-8")

                if not Teacher.query.filter_by(username=username).first():
                    db.session.add(Teacher(username=username, name=teacher_name, password=pw_hash))
                    f.write(f"{username}          {teacher_name}           {password}          {pw_hash}\n")


        db.session.commit()
### use python -m utils.genpass


        

