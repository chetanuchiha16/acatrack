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

import pandas as pd
from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app_init import bcrypt
from models import Teacher, StudentAuth, Mentor, ParentAuth, db
from models.paths import db_path, email_excel_path, mentor_excel_path, get_db_path
from models.batch_manager import BatchManager, bm

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


def _fetch_source_rows(batch_year: int) -> Tuple[List[Tuple[str, str]], List[Tuple[str]]]:
    """Fetch student(usn,name) and teacher(initials) tuples from SQLite for a specific batch."""
    conn, cur = _connect_sqlite(batch_year)
    try:
        teachers = cur.execute("SELECT Mentor_Name FROM Staffs").fetchall()
        students = cur.execute("SELECT student_usn, student_name FROM SEM4").fetchall()
    finally:
        conn.close()
    return students, teachers


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
    
    batch_year = int(request.args.get("batch_year", 2022))  # default if not passed

    
    

    with bm.session_scope(batch_year) as db:
        students, teachers = _fetch_source_rows(batch_year)

        if mode == "all":
            StudentAuth.query.delete()
            Teacher.query.delete()
            ParentAuth.query.delete()
            db.session.commit()

        out = io.StringIO()
        out.write("username,name,plain_password,password_hash,role,linked_student\n")

        # --- Students + Parents
        for usn, name in students:
            if not usn:
                continue
            name = (name or "").strip()
            usn = str(usn).strip()

            if mode == "missing" and StudentAuth.query.filter_by(username=usn).first():
                continue

            plain_student = f"{_safe_seed(name)}{usn[-3:]}"
            pw_hash_student = bcrypt.generate_password_hash(password=plain_student).decode("utf-8")
            student = StudentAuth(
                username=usn,
                name=name,
                password=pw_hash_student,
                student_email="chetan16ck@gmail.com",
                student_phno="123456789"
            )
            db.session.add(student)
            out.write(f"{usn},{name},{plain_student},{pw_hash_student},student,\n")

            parent_username = f"{usn}_parent"
            if not ParentAuth.query.filter_by(username=parent_username).first():
                plain_parent = "default123"
                pw_hash_parent = bcrypt.generate_password_hash(password=plain_parent).decode("utf-8")
                new_parent = ParentAuth(
                    username=parent_username,
                    password=pw_hash_parent,
                    student_usn=usn,
                    name=f"Parent of {student.name}" if student else "Parent",
                    email="chetan16ck@gmail.com",
                    phone="123456789"
                )
                db.session.add(new_parent)
                out.write(f"{parent_username},Parent of {name},{plain_parent},{pw_hash_parent},parent,{usn}\n")

        # --- Teachers
        for (teacher_name,) in teachers:
            teacher_name = (teacher_name or "").strip()
            if mode == "missing" and Teacher.query.filter_by(name=teacher_name).first():
                continue

            username = _unique_teacher_username()
            plain = f"{_safe_seed(teacher_name.split(' ', 1)[1])}{username[-3:]}"
            pw_hash = bcrypt.generate_password_hash(password=plain).decode("utf-8")
            if not Teacher.query.filter_by(name=teacher_name).first():
                db.session.add(Teacher(username=username, name=teacher_name, password=pw_hash))
                out.write(f"{username},{teacher_name},{plain},{pw_hash},teacher,\n")

        db.session.commit()

        out.seek(0)
        return send_file(
            io.BytesIO(out.getvalue().encode("utf-8")),
            mimetype="text/csv",
            as_attachment=True,
            download_name="generated_passwords.csv",
        )




@admin_bp.route("/upload-emails", methods=["POST"])
def upload_emails():
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

    os.makedirs(os.path.dirname(email_excel_path) or ".", exist_ok=True)
    save_path = email_excel_path if ext == ".xlsx" else email_excel_path.replace(".xlsx", ".csv")
    file.save(save_path)

    try:
        df = pd.read_excel(save_path) if ext == ".xlsx" else pd.read_csv(save_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 400

    required_cols = ["student_usn", "student_name", "Parent_Email", "Student_Email"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(missing)}"}), 400

    count_inserted = 0
    count_updated = 0

    for _, row in df.iterrows():
        usn = str(row["student_usn"]).strip()
        if not usn:
            continue

        student = StudentAuth.query.filter_by(username=usn).first()
        

        if student:
            # update existing student record
            student.student_email = str(row["Student_Email"]).strip()
            student.student_phno = str(row.get("Student_PHNO", "")).strip()

            # update parent (via relationship)
            if student.parent_account:
                student.parent_account.email = str(row["Parent_Email"]).strip()
                student.parent_account.phone = str(row.get("Parent_PHNO", "")).strip()
            else:
                # create parent if missing
                parent_username = f"{student.username}_parent"
                plain_parent_pw = "default123"
                pw_hash = bcrypt.generate_password_hash(plain_parent_pw).decode("utf-8")

                parent = ParentAuth(
                    username=parent_username,
                    password=pw_hash,
                    email=str(row["Parent_Email"]).strip(),
                    phone=str(row.get("Parent_PHNO", "")).strip(),
                    student_usn=student.username
                )
                db.session.add(parent)

            count_updated += 1

        else:
            # insert new student + parent record
            new_student = StudentAuth(
                username=usn,
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
                student_usn=usn,
                name=str(row.get("Parent_Name", f"Parent of {row['student_name']}")).strip(),
                relation=str(row.get("Parent_Relation", "Guardian")).strip()
            )

            db.session.add(new_parent)

            count_inserted += 1


    db.session.commit()
    return jsonify({
        "status": "success",
        "emails_inserted": count_inserted,
        "emails_updated": count_updated,
        "file_saved_to": save_path
    })



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
    save_path = mentor_excel_path
    file.save(save_path)

    df = pd.read_excel(save_path)
    required_cols = ["Mentor_Name", "student_usn"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing columns: {missing}"}), 400

    count_mentors = 0
    count_mappings = 0
    mentor_cache = {}

    with bm.session_scope(batch_year) as db:
        for _, row in df.iterrows():
            mentor_name = str(row["Mentor_Name"]).strip()
            student_usn = str(row["student_usn"]).strip()
            if not student_usn:
                continue

            # get or create mentor
            mentor = mentor_cache.get(mentor_name)
            if mentor is None:
                mentor = Mentor.query.filter_by(name=mentor_name).first()
                if mentor is None:
                    mentor = Mentor(name=mentor_name)
                    db.session.add(mentor)
                    db.session.flush()
                    count_mentors += 1
                mentor_cache[mentor_name] = mentor

            student = StudentAuth.query.filter_by(username=student_usn).first()
            if student:
                student.mentor_id = mentor.id
                count_mappings += 1

            teacher = Teacher.query.filter_by(name=mentor_name).first()
            if teacher and teacher.mentor_id is None:
                teacher.mentor_id = mentor.id

        db.session.commit()

    return jsonify({
        "status": "success",
        "mentors_inserted": count_mentors,
        "mappings_inserted": count_mappings,
        "file_saved_to": save_path,
        "batch_year": batch_year
    })

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
