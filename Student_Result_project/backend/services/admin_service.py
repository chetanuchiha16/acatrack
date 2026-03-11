# backend/services/admin_service.py
from logger_config import get_logger
from models.batch_manager import bm
from models.schema import ExportCache
import tempfile
import pandas as pd
import io

logger = get_logger(__name__)

def process_mentor_upload_file(file, batch_year, db_session_maker, bcrypt, Mentor, Teacher, StudentAuth, _unique_teacher_username, _safe_seed, upload_excel_to_supabase):
    """
    Handles the heavy Excel generation logic.
    """
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
        file.save(tmpfile.name)
        tmpfile.flush()
        df = pd.read_excel(tmpfile.name)

        # Optional: Upload mentor Excel to Supabase for long-term storage
        mentor_folder = f"mentors/{batch_year}"
        mentor_excel_name = f"mentors_{batch_year}.xlsx"
        try:
            mentor_excel_url = upload_excel_to_supabase(
                tmpfile.name, mentor_excel_name, mentor_folder
            )
            logger.debug(f"Mentor Excel uploaded to Supabase: {mentor_excel_url}")
        except Exception as e:
            logger.error(f"Mentor Excel upload to Supabase failed: {e}")
            mentor_excel_url = None

    required_cols = ["Mentor_Name", "student_usn"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return {"error": f"Missing columns: {missing}"}, 400

    count_mentors = 0
    count_mappings = 0
    mentor_cache = {}
    out = io.StringIO()
    out.write(
        "username,name,plain_password,password_hash,role,linked_student\n"
    )  # CSV header

    with db_session_maker(batch_year) as db:
        # Pre-fetch students, mentors and teachers to avoid N+1
        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = StudentAuth.query.filter(
            StudentAuth.usn.in_(usns_in_df)
        ).all()
        student_map = {s.usn: s for s in existing_students}

        mentor_names_in_df = list(
            set([str(name).strip() for name in df["Mentor_Name"] if str(name).strip()])
        )
        existing_mentors = Mentor.query.filter(
            Mentor.name.in_(mentor_names_in_df)
        ).all()
        mentor_cache = {m.name: m for m in existing_mentors}

        existing_teachers = Teacher.query.filter(
            Teacher.name.in_(mentor_names_in_df)
        ).all()
        teacher_cache = {t.name: t for t in existing_teachers}

        for _, row in df.iterrows():
            mentor_name = str(row["Mentor_Name"]).strip()
            student_usn = str(row["student_usn"]).strip()
            if not student_usn:
                continue

            mentor = mentor_cache.get(mentor_name)
            if mentor is None:
                # Still check db just in case, but unlikely since we pre-fetched all in df
                mentor = Mentor(name=mentor_name)
                db.session.add(mentor)
                db.session.flush()
                count_mentors += 1

                teacher = teacher_cache.get(mentor_name)
                if not teacher:
                    username = _unique_teacher_username()
                    plain_pw = (
                        f"{_safe_seed(mentor_name.split(' ', 1)[-1])}{username[-3:]}"
                    )
                    pw_hash = bcrypt.generate_password_hash(plain_pw).decode("utf-8")
                    teacher = Teacher(
                        username=username,
                        name=mentor_name,
                        password=pw_hash,
                        mentor_id=mentor.id,
                    )
                    db.session.add(teacher)
                    teacher_cache[mentor_name] = teacher
                    out.write(
                        f"{username},{mentor_name},{plain_pw},{pw_hash},teacher,\n"
                    )
                mentor_cache[mentor_name] = mentor

            student = student_map.get(student_usn)
            if student:
                student.mentor_id = mentor.id
                count_mappings += 1

            teacher = teacher_cache.get(mentor_name)
            if teacher and teacher.mentor_id is None:
                teacher.mentor_id = mentor.id

        db.session.commit()

    # Save CSV to the database cache instead of RAM
    out.seek(0)
    csv_str = out.getvalue()
    
    with db_session_maker(batch_year) as db:
        existing_cache = ExportCache.query.filter_by(batch_year=batch_year).first()
        if existing_cache:
            existing_cache.csv_content = csv_str
        else:
            new_cache = ExportCache(batch_year=batch_year, csv_content=csv_str)
            db.session.add(new_cache)
        db.session.commit()

    response = {
        "status": "success",
        "mentors_inserted": count_mentors,
        "mappings_inserted": count_mappings,
        "batch_year": batch_year,
        "csv_download_url": f"/admin/download-teachers-csv?batch_year={batch_year}",
    }
    if mentor_excel_url:
        response["mentor_excel_url"] = mentor_excel_url

    return response, 200

def process_email_upload_file(temp_upload_path, ext, batch_year, db_session_maker, bcrypt, StudentAuth, ParentAuth, joinedload):
    # Load DataFrame
    try:
        df = (
            pd.read_excel(temp_upload_path)
            if ext == ".xlsx"
            else pd.read_csv(temp_upload_path)
        )
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}, 400

    required_cols = ["student_usn", "student_name", "Parent_Email", "Student_Email"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return (
            {"error": f"Missing required columns: {', '.join(missing)}"}
        ), 400

    count_inserted = 0
    count_updated = 0

    with db_session_maker(batch_year) as db:
        # Pre-fetch existing students to avoid N+1
        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = StudentAuth.query.options(joinedload(StudentAuth.parent_account)).filter(
            StudentAuth.usn.in_(usns_in_df)
        ).all()
        student_map = {s.usn: s for s in existing_students}

        for _, row in df.iterrows():
            usn = str(row["student_usn"]).strip()
            if not usn:
                continue
            student = student_map.get(usn)

            if student:
                # update existing student record
                student.student_email = str(row.get("Student_Email", "")).strip()
                student.student_phno = str(row.get("Student_PHNO", "")).strip()

                # update parent (via relationship)
                if student.parent_account:
                    student.parent_account.email = str(row["Parent_Email"]).strip()
                    student.parent_account.phone = str(
                        row.get("Parent_PHNO", "")
                    ).strip()
                else:
                    parent_username = f"{student.usn}_parent"
                    plain_parent_pw = "default123"
                    pw_hash = bcrypt.generate_password_hash(plain_parent_pw).decode(
                        "utf-8"
                    )
                    parent = ParentAuth(
                        username=parent_username,
                        password=pw_hash,
                        email=str(row["Parent_Email"]).strip(),
                        phone=str(row.get("Parent_PHNO", "")).strip(),
                        student=student,
                    )
                    db.session.add(parent)
                count_updated += 1

            else:
                # insert new student + parent records
                new_student = StudentAuth(
                    usn=usn,
                    batch_year=batch_year,
                    name=str(row["student_name"]).strip(),
                    student_email=str(row["Student_Email"]).strip(),
                    student_phno=str(row.get("Student_PHNO", "")).strip(),
                )
                db.session.add(new_student)

                parent_username = f"{usn}_parent"
                plain_parent_pw = "default123"
                pw_hash = bcrypt.generate_password_hash(plain_parent_pw).decode("utf-8")
                new_parent = ParentAuth(
                    username=parent_username,
                    password=pw_hash,
                    email=str(row["Parent_Email"]).strip(),
                    phone=str(row.get("Parent_PHNO", "")).strip(),
                    student=new_student,
                    name=str(
                        row.get("Parent_Name", f"Parent of {row['student_name']}")
                    ).strip(),
                    relation=str(row.get("Parent_Relation", "Guardian")).strip(),
                )
                db.session.add(new_parent)
                count_inserted += 1

        db.session.commit()

    return {
        "status": "success",
        "inserted": count_inserted,
        "updated": count_updated,
        "batch_year": batch_year
    }, 200
