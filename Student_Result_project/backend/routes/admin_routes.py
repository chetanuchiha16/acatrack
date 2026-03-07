"""
Admin routes for generating accounts, uploading email lists, and uploading mentor mappings.

FEATURES
- Secret-protected endpoints using header: X-Admin-Secret
- Generate Student + Teacher accounts from your SQLite source tables
- Option to create ONLY missing accounts (default) or ALL (re-generate)
- Returns a downloadable CSV of (username,name,plain_password,hash)
- Upload .xlsx or .csv of emails; file is saved to models.paths.email_excel_path
- Validates required columns and inserts new rows into StudentAuth table
- Upload mentor Excel; validates and inserts into Mentor  tables
"""
from __future__ import annotations

from werkzeug.security import generate_password_hash  # add this import
import io
import os
import random
import sqlite3
from typing import List, Tuple
from sqlalchemy import text, inspect, delete
import pandas as pd
from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename
from app_init import bcrypt
from models import Teacher, StudentAuth, Mentor, ParentAuth, db
from models.paths import email_excel_path, mentor_excel_path, get_db_path, excel_dir
from models.batch_manager import BatchManager, bm
from pathlib import Path
from models.fetch import SEMESTERS
import tempfile
from models.cloud_utils import upload_excel_to_supabase, download_excel_from_supabase
from logger_config import get_logger

logger = get_logger(__name__)

# ---------- Blueprint ----------
admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# Fallback secret if neither env nor app.config provides one (change this!)
DEFAULT_ADMIN_SECRET = "supersecretkey"


# ---------- Helpers ----------
def _get_admin_secret() -> str:
    return (
        os.environ.get("ADMIN_SECRET")
        or current_app.config.get("ADMIN_SECRET")
        or DEFAULT_ADMIN_SECRET
    )


def _check_secret(req) -> bool:
    provided = req.headers.get("X-Admin-Secret", "")
    return provided and provided == _get_admin_secret()


def _safe_seed(text: str | None) -> str:
    base = (text or "user").strip()
    return (base[:4] if len(base) >= 4 else base.ljust(4, "0"))


def _connect_sqlite(batch_year: int) -> Tuple[sqlite3.Connection, sqlite3.Cursor]:
    conn = sqlite3.connect(get_db_path(batch_year))
    cur = conn.cursor()
    return conn, cur


def _fetch_source_rows(batch_year: int) -> list[tuple[str,str]]:
    students_set = set()
    with bm.session_scope(batch_year) as db:
        students = StudentAuth.query.filter_by(batch_year=batch_year).all()
        for s in students:
            students_set.add((s.usn, s.name))

    return list(students_set)


def _unique_teacher_username() -> str:
    while True:
        candidate = str(random.randint(1000, 1010))
        if not Teacher.query.filter_by(username=candidate).first():
            return candidate


# ---------- Routes ----------
@admin_bp.route("/health", methods=["GET"])
def health():
    if not _check_secret(request):
        return jsonify({"status": "unauthorized"}), 401
    return jsonify({"status": "ok"})

@admin_bp.route("/list-batches", methods=["GET"])
def list_batches():
    """Return all existing batch years as JSON."""
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    
    try:
        batches = bm.list_batches()  # should return list of integers, e.g. [2022, 2023, 2024]
    except Exception as e:
        return jsonify({"error": f"Failed to get batches: {e}"}), 500

    return jsonify({"batches": batches})

@admin_bp.route("/generate-accounts", methods=["POST"])
def generate_accounts():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    mode = request.args.get("mode", "missing").lower()
    if mode not in {"missing", "all"}:
        return jsonify({"error": "Invalid mode. Use 'missing' or 'all'."}), 400

    batch_year = int(request.args.get("batch_year", 2022))
    batch_prefix = f"1JS{batch_year % 100}"

    with bm.session_scope(batch_year) as db:
        students = _fetch_source_rows(batch_year)
        # Pre-fetch all students in batch to avoid N+1 queries
        all_students = StudentAuth.query.filter_by(batch_year=batch_year).all()
        student_usn_map = {s.usn: s for s in all_students}

        # --- Delete existing passwords for 'all' mode
        if mode == "all":
            for s in all_students:
                s.password = None
                if s.parent_account:
                    s.parent_account.password = None
            db.session.commit()

        out = io.StringIO()
        out.write("username,name,plain_password,password_hash,role,linked_student\n")

        for usn, name in students:
            if not usn:
                continue
            usn = str(usn).strip()
            name = (name or "").strip()
            # --- Skip if mode is 'missing' and password exists
            existing_student = student_usn_map.get(usn)
            if not existing_student:
                continue
                
            if mode == "missing" and existing_student.password:
                continue

            with db.session.no_autoflush:
                # --- Set student password
                plain_student = f"{_safe_seed(name)}{usn[-3:]}"
                pw_hash_student = bcrypt.generate_password_hash(password=plain_student).decode("utf-8")
                
                existing_student.password = pw_hash_student
                if not existing_student.student_email:
                    existing_student.student_email = os.getenv("C_EMAIL")
                if not existing_student.student_phno:
                    existing_student.student_phno = os.getenv("DEFAULT_NUMBER")
                    
                out.write(f"{usn},{name},{plain_student},{pw_hash_student},student,\n")

                # --- Create or Update parent
                parent_username = f"{usn}_parent"
                plain_parent = "default123"
                pw_hash_parent = bcrypt.generate_password_hash(password=plain_parent).decode("utf-8")
                
                if existing_student.parent_account:
                    parent = existing_student.parent_account
                    parent.password = pw_hash_parent
                else:
                    parent = ParentAuth(
                        username=parent_username,
                        password=pw_hash_parent,
                        student=existing_student,
                        name=f"Parent of {name}",
                        email=os.getenv("C_EMAIL"),
                        phone="123456789"
                    )
                    db.session.add(parent)
                out.write(f"{parent_username},Parent of {name},{plain_parent},{pw_hash_parent},parent,{usn}\n")

        # --- Assign mentors from Excel in Supabase (using new pattern)
        excel_folder = f"mentors/{batch_year}"
        excel_filename = f"mentors_{batch_year}.xlsx"
        mentor_excel_path = None
        try:
            mentor_excel_path = download_excel_from_supabase(excel_filename, excel_folder)
        except Exception as e:
            logger.debug(f"No mentor excel found in Supabase for batch {batch_year}: {e}")

        if mentor_excel_path and os.path.exists(mentor_excel_path):
            df = pd.read_excel(mentor_excel_path)
            all_mentors = Mentor.query.all()
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

        db.session.commit()  # commit all inserts and updates

        # --- Return CSV
        out.seek(0)
        return send_file(
            io.BytesIO(out.getvalue().encode("utf-8")),
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"generated_passwords_{batch_year}.csv",
        )






from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
import tempfile
import os
from models.cloud_utils import upload_excel_to_supabase
from logger_config import get_logger

logger = get_logger(__name__)

@admin_bp.route("/upload-emails", methods=["POST"])
def upload_emails():
    batch_year = int(request.args.get("batch_year", 2022))
    """Upload Excel/CSV with student+parent emails (insert or update)."""

    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename or "")
    if not filename:
        return jsonify({"error": "Invalid filename"}), 400

    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".xlsx", ".csv"}:
        return jsonify({"error": "Only .xlsx or .csv allowed"}), 400

    # Save uploaded file to a unique temp file
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmpfile:
        file.save(tmpfile.name)
        tmpfile.flush()
        temp_upload_path = tmpfile.name

    # Optional: Upload to Supabase for audit/history
    # try:
    #     emails_folder = f"emails/{batch_year}"
    #     emails_file_cloudname = f"emails_{batch_year}{ext}"
    #     emails_upload_url = upload_excel_to_supabase(temp_upload_path, emails_file_cloudname, emails_folder)
    # except Exception as e:
    #     logger.error(f"Email file upload to Supabase failed: {e}")
    #     emails_upload_url = None

    # Load DataFrame
    try:
        df = pd.read_excel(temp_upload_path) if ext == ".xlsx" else pd.read_csv(temp_upload_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 400

    required_cols = ["student_usn", "student_name", "Parent_Email", "Student_Email"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(missing)}"}), 400

    count_inserted = 0
    count_updated = 0

    with bm.session_scope(batch_year) as db:
        # Pre-fetch existing students to avoid N+1
        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = StudentAuth.query.filter(StudentAuth.usn.in_(usns_in_df)).all()
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
                    student.parent_account.phone = str(row.get("Parent_PHNO", "")).strip()
                else:
                    parent_username = f"{student.usn}_parent"
                    plain_parent_pw = "default123"
                    pw_hash = bcrypt.generate_password_hash(plain_parent_pw).decode("utf-8")
                    parent = ParentAuth(
                        username=parent_username,
                        password=pw_hash,
                        email=str(row["Parent_Email"]).strip(),
                        phone=str(row.get("Parent_PHNO", "")).strip(),
                        student=student
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
                    name=str(row.get("Parent_Name", f"Parent of {row['student_name']}")).strip(),
                    relation=str(row.get("Parent_Relation", "Guardian")).strip()
                )
                db.session.add(new_parent)
                count_inserted += 1

        db.session.commit()

    # Clean up temp file
    try:
        os.remove(temp_upload_path)
    except Exception as e:
        logger.debug(f"Temp file cleanup failed: {e}")

    response = {
        "status": "success",
        "emails_inserted": count_inserted,
        "emails_updated": count_updated,
        "batch_year": batch_year,
        # "file_cloud_url": emails_upload_url
    }
    return jsonify(response)

mentor_csv_cache = {}

@admin_bp.route("/upload-mentors", methods=["POST"])
def upload_mentors():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    batch_year = request.args.get("batch_year")
    if not batch_year:
        return jsonify({"error": "batch_year query param required"}), 400
    batch_year = int(batch_year)

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename or "")
    if not filename.endswith(".xlsx"):
        return jsonify({"error": "Only .xlsx allowed"}), 400

    # Create temp file for Excel upload processing
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
        file.save(tmpfile.name)
        tmpfile.flush()
        df = pd.read_excel(tmpfile.name)

        # Optional: Upload mentor Excel to Supabase for long-term storage
        mentor_folder = f"mentors/{batch_year}"
        mentor_excel_name = f"mentors_{batch_year}.xlsx"
        try:
            mentor_excel_url = upload_excel_to_supabase(tmpfile.name, mentor_excel_name, mentor_folder)
            logger.debug(f"Mentor Excel uploaded to Supabase: {mentor_excel_url}")
        except Exception as e:
            logger.error(f"Mentor Excel upload to Supabase failed: {e}")
            mentor_excel_url = None

    required_cols = ["Mentor_Name", "student_usn"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing columns: {missing}"}), 400

    count_mentors = 0
    count_mappings = 0
    mentor_cache = {}
    out = io.StringIO()
    out.write("username,name,plain_password,password_hash,role,linked_student\n")  # CSV header

    with bm.session_scope(batch_year) as db:
        # Pre-fetch students, mentors and teachers to avoid N+1
        usns_in_df = [str(usn).strip() for usn in df["student_usn"] if str(usn).strip()]
        existing_students = StudentAuth.query.filter(StudentAuth.usn.in_(usns_in_df)).all()
        student_map = {s.usn: s for s in existing_students}
        
        mentor_names_in_df = list(set([str(name).strip() for name in df["Mentor_Name"] if str(name).strip()]))
        existing_mentors = Mentor.query.filter(Mentor.name.in_(mentor_names_in_df)).all()
        mentor_cache = {m.name: m for m in existing_mentors}
        
        existing_teachers = Teacher.query.filter(Teacher.name.in_(mentor_names_in_df)).all()
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
                    plain_pw = f"{_safe_seed(mentor_name.split(' ', 1)[-1])}{username[-3:]}"
                    pw_hash = bcrypt.generate_password_hash(plain_pw).decode("utf-8")
                    teacher = Teacher(
                        username=username,
                        name=mentor_name,
                        password=pw_hash,
                        mentor_id=mentor.id
                    )
                    db.session.add(teacher)
                    teacher_cache[mentor_name] = teacher
                    out.write(f"{username},{mentor_name},{plain_pw},{pw_hash},teacher,\n")
                mentor_cache[mentor_name] = mentor

            student = student_map.get(student_usn)
            if student:
                student.mentor_id = mentor.id
                count_mappings += 1

            teacher = teacher_cache.get(mentor_name)
            if teacher and teacher.mentor_id is None:
                teacher.mentor_id = mentor.id

        db.session.commit()

    out.seek(0)
    mentor_csv_cache[batch_year] = out.getvalue()  # store in-memory (single instance)

    response = {
        "status": "success",
        "mentors_inserted": count_mentors,
        "mappings_inserted": count_mappings,
        "batch_year": batch_year,
        "csv_download_url": f"/admin/download-teachers-csv?batch_year={batch_year}"
    }
    if mentor_excel_url:
        response["mentor_excel_url"] = mentor_excel_url

    return jsonify(response)



@admin_bp.route("/download-teachers-csv", methods=["GET"])
def download_teachers_csv():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401
    
    batch_year = int(request.args.get("batch_year", 0))
    csv_content = mentor_csv_cache.get(batch_year)
    if not csv_content:
        return jsonify({"error": "No CSV available, please re-upload mentors"}), 404
    
    return send_file(
        io.BytesIO(csv_content.encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"generated_teachers_batch_{batch_year}.csv"
    )

@admin_bp.route("/create-batch", methods=["POST"])
def create_batch():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    batch_year = request.json.get("batch_year")
    if not batch_year:
        return jsonify({"error": "Missing batch_year"}), 400
    batch_year = int(batch_year)

    
    if batch_year in bm.list_batches():
        return jsonify({"error": f"Batch {batch_year} already exists"}), 400

    try:
        bm.create_batch(batch_year)
        return jsonify({"status": "success", "batch_year": batch_year})
    except Exception as e:
        return jsonify({"error": f"Failed to create batch: {e}"}), 500

@admin_bp.route("/refresh-batch", methods=["POST"])
def refresh_batch():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    batch_year = request.json.get("batch_year")
    if not batch_year:
        return jsonify({"error": "Missing batch_year"}), 400
    batch_year = int(batch_year)

    try:
        bm.refresh_batch_data(batch_year)
        return jsonify({"status": "success", "batch_year": batch_year})
    except Exception as e:
        return jsonify({"error": f"Failed to refresh batch: {e}"})
