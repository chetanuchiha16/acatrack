# backend/services/admin_service.py
import io
import os
import random
import pandas as pd
import base64
import hashlib
from cryptography.fernet import Fernet
from security import hash_password
from logger_config import get_logger
from models.schema import ExportCache, ParentAuth
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from utils.cloud import download_excel_from_supabase
from settings import settings

logger = get_logger(__name__)


def _get_encryption_cipher():
    """Get Fernet cipher using settings.secret_key."""
    secret = settings.secret_key.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def _get_sync_session_maker():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    else:
        sync_url = _raw_url
    sync_engine = create_engine(sync_url)
    return sessionmaker(bind=sync_engine), sync_engine


def get_all_staff():
    SyncSession, engine = _get_sync_session_maker()
    from sqlalchemy import select as sa_select
    from models.schema import Teacher as T
    try:
        with SyncSession() as session:
            result = session.execute(sa_select(T))
            teachers = result.scalars().all()
            return [{"username": t.username, "name": t.name, "email": t.email} for t in teachers]
    finally:
        engine.dispose()


def register_staff_single(name, email, hash_pw_fn):
    SyncSession, engine = _get_sync_session_maker()
    from models.schema import Teacher as T, Mentor as M
    from sqlalchemy import select as sa_select
    username = email.split('@')[0]
    try:
        with SyncSession() as session:
            # Check if exists
            existing = session.execute(sa_select(T).where(T.username == username)).scalars().first()
            if existing:
                return {"error": f"Staff with username {username} already exists"}, 400
            
            mentor = M(name=name)
            session.add(mentor)
            session.flush()
            
            plain_pw = f"staff_{username}"
            pw_hash = hash_pw_fn(plain_pw)
            
            teacher = T(
                username=username,
                name=name,
                email=email,
                password=pw_hash,
                mentor_id=mentor.id
            )
            session.add(teacher)
            session.commit()
            return {"status": "success", "username": username, "plain_password": plain_pw}, 200
    finally:
        engine.dispose()



def process_mentor_upload_file(
    file_path,
    batch_year,
    db_session_maker,
    hash_pw_fn,
    Mentor,
    Teacher,
    StudentAuth,
    _unique_teacher_username_fn,
    _safe_seed_fn,
    upload_excel_fn,
):
    """
    Handles the heavy Excel generation logic.
    NOTE: This function is sync — it's called from an executor in the route.
    """
    df = pd.read_excel(file_path)

    # Upload mentor Excel to Supabase for long-term storage
    mentor_folder = f"mentors/{batch_year}"
    mentor_excel_name = f"mentors_{batch_year}.xlsx"
    try:
        mentor_excel_url = upload_excel_fn(file_path, mentor_excel_name, mentor_folder)
        logger.debug(f"Mentor Excel uploaded to Supabase: {mentor_excel_url}")
    except Exception as e:
        logger.error(f"Mentor Excel upload to Supabase failed: {e}")
        mentor_excel_url = None

    required_cols = ["Mentor_Username", "student_usn"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return {"error": f"Missing required columns: {missing}. Note: We now use Mentor_Username."}, 400


    count_mentors = 0
    count_mappings = 0
    mentor_cache = {}
    out = io.StringIO()
    out.write("username,name,plain_password,password_hash,role,linked_student\n")

    # Use sync SQLAlchemy for this sync function
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Create a sync engine from the URL
    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif _raw_url.startswith("postgres://"):
        sync_url = _raw_url
    else:
        sync_url = _raw_url

    sync_engine = create_engine(sync_url)
    SyncSession = sessionmaker(bind=sync_engine)

    with SyncSession() as session:
        student_repo = StudentRepository.__new__(StudentRepository)
        student_repo.db = session
        mentor_repo = MentorRepository.__new__(MentorRepository)
        mentor_repo.db = session

        # Note: using sync queries directly since this runs in an executor
        from sqlalchemy import select as sa_select
        from models.schema import StudentAuth as SA, Mentor as M, Teacher as T

        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = (
            session.execute(sa_select(SA).where(SA.usn.in_(usns_in_df))).scalars().all()
        )
        student_map = {s.usn: s for s in existing_students}

        usernames_in_df = list(
            set([str(u).strip() for u in df["Mentor_Username"] if str(u).strip()])
        )
        existing_teachers = (
            session.execute(sa_select(T).where(T.username.in_(usernames_in_df)))
            .scalars()
            .all()
        )
        teacher_cache = {t.username: t for t in existing_teachers}

        for _, row in df.iterrows():
            m_username = str(row["Mentor_Username"]).strip()
            student_usn = str(row["student_usn"]).strip()
            if not student_usn or not m_username:
                continue

            teacher = teacher_cache.get(m_username)
            if not teacher:
                # Strictly fail if teacher doesn't exist
                continue

            student = student_map.get(student_usn)
            if student:
                student.mentor_id = teacher.mentor_id
                count_mappings += 1


        session.commit()

    # Save CSV to the database cache
    out.seek(0)
    csv_str = out.getvalue()

    cipher = _get_encryption_cipher()
    encrypted_csv = cipher.encrypt(csv_str.encode("utf-8")).decode("utf-8")

    with SyncSession() as session:
        existing_cache = (
            session.execute(
                sa_select(ExportCache).where(ExportCache.batch_year == batch_year)
            )
            .scalars()
            .first()
        )
        if existing_cache:
            existing_cache.csv_content = encrypted_csv
        else:
            new_cache = ExportCache(batch_year=batch_year, csv_content=encrypted_csv)
            session.add(new_cache)
        session.commit()

    sync_engine.dispose()

    response = {
        "status": "success",
        "mappings_inserted": count_mappings,
        "batch_year": batch_year,
    }

    if mentor_excel_url:
        response["mentor_excel_url"] = mentor_excel_url

    return response, 200


def process_email_upload_file(
    temp_upload_path,
    ext,
    batch_year,
    db_session_maker,
    hash_pw_fn,
    StudentAuth,
    ParentAuth,
    joinedload,
):
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
        return {"error": f"Missing required columns: {', '.join(missing)}"}, 400

    count_inserted = 0
    count_updated = 0

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select as sa_select

    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif _raw_url.startswith("postgres://"):
        sync_url = _raw_url
    else:
        sync_url = _raw_url

    sync_engine = create_engine(sync_url)
    SyncSession = sessionmaker(bind=sync_engine)

    with SyncSession() as session:
        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = (
            session.execute(
                sa_select(StudentAuth).where(StudentAuth.usn.in_(usns_in_df))
            )
            .scalars()
            .all()
        )
        student_map = {s.usn: s for s in existing_students}

        for _, row in df.iterrows():
            usn = str(row["student_usn"]).strip()
            if not usn:
                continue
            student = student_map.get(usn)

            if student:
                student.student_email = str(row.get("Student_Email", "")).strip()
                student.student_phno = str(row.get("Student_PHNO", "")).strip()

                if student.parent_account:
                    student.parent_account.email = str(row["Parent_Email"]).strip()
                    student.parent_account.phone = str(
                        row.get("Parent_PHNO", "")
                    ).strip()
                else:
                    parent_username = f"{student.usn}_parent"
                    plain_parent_pw = "default123"
                    pw_hash = hash_pw_fn(plain_parent_pw)
                    parent = ParentAuth(
                        username=parent_username,
                        password=pw_hash,
                        email=str(row["Parent_Email"]).strip(),
                        phone=str(row.get("Parent_PHNO", "")).strip(),
                        student=student,
                    )
                    session.add(parent)
                count_updated += 1
            else:
                new_student = StudentAuth(
                    usn=usn,
                    batch_year=batch_year,
                    name=str(row["student_name"]).strip(),
                    student_email=str(row["Student_Email"]).strip(),
                    student_phno=str(row.get("Student_PHNO", "")).strip(),
                )
                session.add(new_student)

                parent_username = f"{usn}_parent"
                plain_parent_pw = "default123"
                pw_hash = hash_pw_fn(plain_parent_pw)
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
                session.add(new_parent)
                count_inserted += 1

        session.commit()

    sync_engine.dispose()

    return {
        "status": "success",
        "inserted": count_inserted,
        "updated": count_updated,
        "batch_year": batch_year,
    }, 200


def process_staff_bulk_upload(file_path, hash_pw_fn):
    SyncSession, engine = _get_sync_session_maker()
    from models.schema import Teacher as T, Mentor as M
    from sqlalchemy import select as sa_select
    
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}, 400

    required = ["Name", "Email"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        return {"error": f"Missing columns: {missing}"}, 400

    results = []
    try:
        with SyncSession() as session:
            for _, row in df.iterrows():
                name = str(row["Name"]).strip()
                email = str(row["Email"]).strip()
                if not name or not email:
                    continue
                
                username = email.split('@')[0]
                
                # Check if exists
                existing = session.execute(sa_select(T).where(T.username == username)).scalars().first()
                if existing:
                    continue
                
                mentor = M(name=name)
                session.add(mentor)
                session.flush()
                
                plain_pw = f"staff_{username}"
                pw_hash = hash_pw_fn(plain_pw)
                
                teacher = T(
                    username=username,
                    name=name,
                    email=email,
                    password=pw_hash,
                    mentor_id=mentor.id
                )
                session.add(teacher)
                results.append({"username": username, "name": name, "plain_password": plain_pw})
            
            session.commit()
            return {"status": "success", "registered": results}, 200
    finally:
        engine.dispose()


def _safe_seed(text: str | None) -> str:

    base = (text or "user").strip()
    return base[:4] if len(base) >= 4 else base.ljust(4, "0")


def _unique_teacher_username(db_session) -> str:
    from sqlalchemy import select as sa_select
    from models.schema import Teacher

    while True:
        candidate = str(random.randint(1000, 1010))
        result = db_session.execute(
            sa_select(Teacher.username).where(Teacher.username == candidate)
        )
        if result.scalars().first() is None:
            return candidate


def _fetch_source_rows(batch_year: int) -> list[tuple[str, str]]:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select as sa_select
    from models.schema import StudentAuth as SA

    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif _raw_url.startswith("postgres://"):
        sync_url = _raw_url
    else:
        sync_url = _raw_url

    sync_engine = create_engine(sync_url)
    SyncSession = sessionmaker(bind=sync_engine)

    students_set = set()
    with SyncSession() as session:
        students = (
            session.execute(sa_select(SA).where(SA.batch_year == batch_year))
            .scalars()
            .all()
        )
        for s in students:
            students_set.add((s.usn, s.name))

    sync_engine.dispose()
    return list(students_set)


def generate_accounts_csv(mode: str, batch_year: int) -> tuple[io.BytesIO, str]:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, selectinload
    from sqlalchemy import select as sa_select
    from models.schema import StudentAuth as SA

    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif _raw_url.startswith("postgres://"):
        sync_url = _raw_url
    else:
        sync_url = _raw_url

    sync_engine = create_engine(sync_url)
    SyncSession = sessionmaker(bind=sync_engine)

    with SyncSession() as session:
        students = _fetch_source_rows(batch_year)
        all_students = (
            session.execute(
                sa_select(SA)
                .options(selectinload(SA.parent_account))
                .where(SA.batch_year == batch_year)
            )
            .scalars()
            .all()
        )
        student_usn_map = {s.usn: s for s in all_students}

        if mode == "all":
            for s in all_students:
                s.password = None
                if s.parent_account:
                    s.parent_account.password = None
            session.commit()

        out = io.StringIO()
        out.write("username,name,plain_password,password_hash,role,linked_student\n")

        for usn, name in students:
            if not usn:
                continue
            usn = str(usn).strip()
            name = (name or "").strip()
            existing_student = student_usn_map.get(usn)
            if not existing_student:
                continue

            if mode == "missing" and existing_student.password:
                continue

            with session.no_autoflush:
                plain_student = f"{_safe_seed(name)}{usn[-3:]}"
                pw_hash_student = hash_password(plain_student)

                existing_student.password = pw_hash_student
                if not existing_student.student_email:
                    existing_student.student_email = settings.c_email
                if not existing_student.student_phno:
                    existing_student.student_phno = settings.default_number

                out.write(f"{usn},{name},{plain_student},{pw_hash_student},student,\n")

                parent_username = f"{usn}_parent"
                plain_parent = "default123"
                pw_hash_parent = hash_password(plain_parent)

                if existing_student.parent_account:
                    parent = existing_student.parent_account
                    parent.password = pw_hash_parent
                else:
                    parent = ParentAuth(
                        username=parent_username,
                        password=pw_hash_parent,
                        student=existing_student,
                        name=f"Parent of {name}",
                        email=settings.c_email,
                        phone="123456789",
                    )
                    session.add(parent)
                out.write(
                    f"{parent_username},Parent of {name},{plain_parent},{pw_hash_parent},parent,{usn}\n"
                )

        # Assign mentors from Excel in Supabase
        excel_folder = f"mentors/{batch_year}"
        excel_filename = f"mentors_{batch_year}.xlsx"
        mentor_excel_path = None
        try:
            mentor_excel_path = download_excel_from_supabase(
                excel_filename, excel_folder
            )
        except Exception as e:
            logger.debug(
                f"No mentor excel found in Supabase for batch {batch_year}: {e}"
            )

        if mentor_excel_path and os.path.exists(mentor_excel_path):
            from models.schema import Mentor as M

            df = pd.read_excel(mentor_excel_path)
            all_mentors = session.execute(sa_select(M)).scalars().all()
            mentor_name_map = {m.name: m for m in all_mentors}

            for _, row in df.iterrows():
                student_usn = str(row.get("student_usn", "")).strip()
                mentor_name = str(row.get("Mentor_Name", "")).strip()
                if not student_usn or not mentor_name:
                    continue
                student = student_usn_map.get(student_usn)
                mentor = mentor_name_map.get(mentor_name)
                if student and mentor:
                    student.mentor_id = mentor.id

        session.commit()

        out.seek(0)
        result = (
            io.BytesIO(out.getvalue().encode("utf-8")),
            f"generated_passwords_{batch_year}.csv",
        )

    sync_engine.dispose()
    return result

def process_subject_upload_file(
    temp_upload_path: str,
) -> tuple[list[dict], int]:
    try:
        df = pd.read_excel(temp_upload_path)
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}, 400

    required_cols = ["code", "name", "credits"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return {"error": f"Missing required columns: {', '.join(missing)}"}, 400

    results = []
    for _, row in df.iterrows():
        code = str(row["code"]).strip().upper()
        name = str(row["name"]).strip()
        try:
            credits = int(row["credits"])
        except ValueError:
            credits = 0
        
        if not code or not name or code == 'NAN' or name == 'NAN':
            continue
            
        results.append({
            "code": code,
            "name": name,
            "credits": credits
        })
        
    return results, 200


def process_student_enrollment_upload_file(
    temp_upload_path: str,
) -> tuple[list[dict], int]:
    try:
        df = pd.read_excel(temp_upload_path)
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}, 400

    required_cols = ["usn", "name", "email", "phone"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return {"error": f"Missing required columns: {', '.join(missing)}"}, 400

    results = []
    for _, row in df.iterrows():
        usn = str(row["usn"]).strip().upper()
        name = str(row["name"]).strip()
        email = str(row.get("email", "")).strip()
        phone = str(row.get("phone", "")).strip()
        
        if not usn or not name or usn == 'NAN' or name == 'NAN':
            continue
            
        results.append({
            "usn": usn,
            "name": name,
            "email": email,
            "phone": phone
        })
        
    return results, 200

