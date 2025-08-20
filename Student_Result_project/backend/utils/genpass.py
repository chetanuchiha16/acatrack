import sqlite3
from models.paths import db_path
from app_init import bcrypt
from models import db, User, Teacher, StudentEmail
import pandas as pd
from models.paths import email_excel_path, mentor_excel_path
from app_init import create_app
from models import Mentor, MentorStudent
app = create_app()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

techers = cursor.execute("SELECT SEM1_Staff_Initials FROM Subjectwise_result_1").fetchall()
stus = cursor.execute("SELECT Student_USN, Student_Name FROM SEM1").fetchall()

conn.commit()
cursor.close()
conn.close()

import random
import string

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        with open("password.txt", "w") as f:
            for username, name in stus:
                password = name[0:4] + username[-3:]
                pw_hash = bcrypt.generate_password_hash(password=password).decode("utf-8")
                if not User.query.filter_by(username = username).first():
                    db.session.add(User(username = username, name = name, password = pw_hash))
                    f.write(f"{username}          {name}           {password}          {pw_hash}\n")

        db.session.commit()

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

    # Load Excel
    excel_path = email_excel_path  # make sure file is in same directory or give full path
    df = pd.read_excel(excel_path)

    # Required column names in Excel
    required_cols = ["Student_USN", "Student_Name", "Parent_Email", "Student_Email"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing column in Excel: {col}")

    with app.app_context():
        # Create the table if not exists
        db.create_all()

        count_inserted = 0
        for _, row in df.iterrows():
            usn = str(row["Student_USN"]).strip()
            name = str(row["Student_Name"]).strip()
            parent_email = str(row["Parent_Email"]).strip()
            student_email = str(row["Student_Email"]).strip()

            # Check if USN already exists
            if not StudentEmail.query.filter_by(usn=usn).first():
                db.session.add(
                    StudentEmail(
                        usn=usn,
                        name=name,
                        parent_email=parent_email,
                        student_email=student_email
                    )
                )
                count_inserted += 1

        db.session.commit()
        print(f"Inserted {count_inserted} new email records.")

        #mentors

        excel_path = mentor_excel_path  # change to your file path

        df_mentors = pd.read_excel(excel_path)

        # Required columns
        required_mentor_cols = ["Mentor_Name", "Student_USN"]
        for col in required_mentor_cols:
            if col not in df_mentors.columns:
                raise ValueError(f"Missing column in Excel: {col}")

        with app.app_context():
            db.create_all()  # make sure Mentor + MentorStudent tables exist

            mentor_cache = {}  # cache to reduce queries
            count_mentors = 0
            count_mappings = 0

            for _, row in df_mentors.iterrows():
                mentor_name = str(row["Mentor_Name"]).strip()
                student_usn = str(row["Student_USN"]).strip()

                # Get or create Mentor
                mentor = mentor_cache.get(mentor_name)
                if mentor is None:
                    mentor = Mentor.query.filter_by(name=mentor_name).first()
                    if mentor is None:
                        mentor = Mentor(name=mentor_name)
                        db.session.add(mentor)
                        db.session.flush()  # get mentor.id without full commit
                        count_mentors += 1
                    mentor_cache[mentor_name] = mentor

                # Add MentorStudent mapping if not exists
                exists = MentorStudent.query.filter_by(
                    mentor_id=mentor.id,
                    student_usn=student_usn
                ).first()
                if not exists:
                    db.session.add(MentorStudent(
                        mentor_id=mentor.id,
                        student_usn=student_usn
                    ))
                    count_mappings += 1

            db.session.commit()
            print(f"Inserted {count_mentors} new mentors, {count_mappings} mentor-student mappings.")
            
        ### use python -m utils.genpass


                

