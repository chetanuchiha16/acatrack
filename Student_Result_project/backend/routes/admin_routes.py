"""
Admin routes for generating accounts, uploading email lists, and uploading mentor mappings.

FEATURES
- Secret-protected endpoints using header: X-Admin-Secret
- Generate Student + Teacher accounts from your SQLite source tables
- Option to create ONLY missing accounts (default) or ALL (re-generate)
- Returns a downloadable CSV of (username,name,plain_password,hash)
- Upload .xlsx or .csv of emails; file is saved to models.paths.email_excel_path
- Validates required columns and inserts new rows into StudentAuth table
- Upload mentor Excel; validates and inserts into Mentor + MentorStudent tables
"""
from __future__ import annotations

import io
import os
import random
import sqlite3
from typing import List, Tuple

import pandas as pd
from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app_init import bcrypt
from models import Teacher, StudentAuth, Mentor, MentorStudent, db
from models.paths import db_path, email_excel_path, mentor_excel_path

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


def _connect_sqlite() -> Tuple[sqlite3.Connection, sqlite3.Cursor]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    return conn, cur


def _fetch_source_rows() -> Tuple[List[Tuple[str, str]], List[Tuple[str]]]:
    """Fetch student(usn,name) and teacher(initials) tuples from SQLite."""
    conn, cur = _connect_sqlite()
    try:
        teachers = cur.execute(
            "SELECT SEM1_Staff_Initials FROM Subjectwise_result_1"
        ).fetchall()
        students = cur.execute(
            "SELECT student_usn, student_name FROM SEM1"
        ).fetchall()
    finally:
        conn.close()
    return students, teachers


def _unique_teacher_username() -> str:
    while True:
        candidate = str(random.randint(10_000_000, 99_999_999))
        if not Teacher.query.filter_by(username=candidate).first():
            return candidate


# ---------- Routes ----------
@admin_bp.route("/health", methods=["GET"])
def health():
    if not _check_secret(request):
        return jsonify({"status": "unauthorized"}), 401
    return jsonify({"status": "ok"})


@admin_bp.route("/generate-accounts", methods=["POST"])
def generate_accounts():
    """Create student/teacher accounts and return a downloadable CSV."""
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    mode = request.args.get("mode", "missing").lower()
    if mode not in {"missing", "all"}:
        return jsonify({"error": "Invalid mode. Use 'missing' or 'all'."}), 400

    students, teachers = _fetch_source_rows()

    if mode == "all":
        StudentAuth.query.delete()
        Teacher.query.delete()
        db.session.commit()

    out = io.StringIO()
    out.write("username,name,plain_password,password_hash,role\n")

    # Students
    for usn, name in students:
        if not usn:
            continue
        name = (name or "").strip()
        usn = str(usn).strip()

        if mode == "missing" and StudentAuth.query.filter_by(username=usn).first():
            continue

        plain = f"{_safe_seed(name)}{usn[-3:]}"
        pw_hash = bcrypt.generate_password_hash(password=plain).decode("utf-8")
        db.session.add(StudentAuth(username=usn, name=name, password=pw_hash))
        out.write(f"{usn},{name},{plain},{pw_hash},student\n")

    # Teachers
    for (teacher_name,) in teachers:
        teacher_name = (teacher_name or "").strip()
        if mode == "missing" and Teacher.query.filter_by(name=teacher_name).first():
            continue

        username = _unique_teacher_username()
        plain = f"{_safe_seed(teacher_name)}{username[-3:]}"
        pw_hash = bcrypt.generate_password_hash(password=plain).decode("utf-8")
        db.session.add(Teacher(username=username, name=teacher_name, password=pw_hash))
        out.write(f"{username},{teacher_name},{plain},{pw_hash},teacher\n")

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
            # update existing record
            # student.name = str(row["student_name"]).strip()
            student.parent_email = str(row["Parent_Email"]).strip()
            student.student_email = str(row["Student_Email"]).strip()
            student.parent_phno = str(row.get("Parent_PHNO", "")).strip()
            student.student_phno = str(row.get("Student_PHNO", "")).strip()
            count_updated += 1
        else:
            # insert new record
            db.session.add(
                StudentAuth(
                    username=usn,
                    name=str(row["student_name"]).strip(),
                    parent_email=str(row["Parent_Email"]).strip(),
                    student_email=str(row["Student_Email"]).strip(),
                    parent_phno=str(row.get("Parent_PHNO", "")).strip(),
                    student_phno=str(row.get("Student_PHNO", "")).strip(),
                )
            )
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
    """Upload Excel with Mentor-Student mapping."""
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename or "")
    if not filename or not filename.endswith(".xlsx"):
        return jsonify({"error": "Only .xlsx allowed"}), 400

    os.makedirs(os.path.dirname(mentor_excel_path) or ".", exist_ok=True)
    save_path = mentor_excel_path
    file.save(save_path)

    try:
        df = pd.read_excel(save_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read mentor file: {e}"}), 400

    required_cols = ["Mentor_Name", "student_usn"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(missing)}"}), 400

    mentor_cache = {}
    count_mentors = 0
    count_mappings = 0

    for _, row in df.iterrows():
        mentor_name = str(row["Mentor_Name"]).strip()
        student_usn = str(row["student_usn"]).strip()
        if not student_usn:
            continue

        mentor = mentor_cache.get(mentor_name)
        if mentor is None:
            mentor = Mentor.query.filter_by(name=mentor_name).first()
            if mentor is None:
                mentor = Mentor(name=mentor_name)
                db.session.add(mentor)
                db.session.flush()
                count_mentors += 1
            mentor_cache[mentor_name] = mentor

        if not MentorStudent.query.filter_by(mentor_id=mentor.id, student_usn=student_usn).first():
            db.session.add(MentorStudent(mentor_id=mentor.id, student_usn=student_usn))
            count_mappings += 1

    db.session.commit()
    return jsonify({
        "status": "success",
        "mentors_inserted": count_mentors,
        "mappings_inserted": count_mappings,
        "file_saved_to": save_path,
    })
