"""
Admin routes for generating accounts and uploading email lists.

FEATURES
- Secret-protected endpoints using header: X-Admin-Secret
- Generate Student + Teacher accounts from your SQLite source tables
- Option to create ONLY missing accounts (default) or ALL (re-generate)
- Returns a downloadable CSV of (username,name,plain_password,hash)
- Upload .xlsx or .csv of emails; file is saved to models.paths.email_excel_path
- Validates required columns and inserts new rows into StudentEmail table

SETUP
1) Put this file somewhere importable (e.g., `admin_routes.py` at project root).
2) Register the blueprint inside `create_app()`:

    from admin_routes import admin_bp
    app.register_blueprint(admin_bp)

3) Configure a secret. Prefer environment variable `ADMIN_SECRET`. As a fallback
   you can set app.config["ADMIN_SECRET"] or edit DEFAULT_ADMIN_SECRET below.

USAGE
- Generate accounts (missing only):
    curl -X POST http://localhost:5000/admin/generate-accounts \
         -H "X-Admin-Secret: your-secret" -o passwords.csv

- Generate accounts (force ALL: re-create users & teachers):
    curl -X POST "http://localhost:5000/admin/generate-accounts?mode=all" \
         -H "X-Admin-Secret: your-secret" -o passwords.csv

- Upload emails (.xlsx or .csv):
    curl -X POST http://localhost:5000/admin/upload-emails \
         -H "X-Admin-Secret: your-secret" \
         -F "file=@emails.xlsx"

"""
from __future__ import annotations

import io
import os
import random
import sqlite3
from typing import Iterable, List, Tuple

import pandas as pd
from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app_init import bcrypt
from models import Teacher, User, StudentEmail, db
from models.paths import db_path, email_excel_path

# ---------- Blueprint ----------
admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# Fallback secret if neither env nor app.config provides one (change this!)
DEFAULT_ADMIN_SECRET = "supersecretkey"


# ---------- Helpers ----------
def _get_admin_secret() -> str:
    # Priority: environment variable > app.config > default fallback
    return (
        os.environ.get("ADMIN_SECRET")
        or current_app.config.get("ADMIN_SECRET")
        or DEFAULT_ADMIN_SECRET
    )


def _check_secret(req) -> bool:
    provided = req.headers.get("X-Admin-Secret", "")
    return provided and provided == _get_admin_secret()


def _safe_seed(text: str | None) -> str:
    """Make a 4-char seed for passwords even if text is None/short."""
    base = (text or "user").strip()
    return (base[:4] if len(base) >= 4 else base.ljust(4, "0"))


def _connect_sqlite() -> Tuple[sqlite3.Connection, sqlite3.Cursor]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    return conn, cur


def _fetch_source_rows() -> Tuple[List[Tuple[str, str]], List[Tuple[str]]]:
    """Fetch student(usn,name) and teacher(initials) tuples from SQLite.

    Modify the queries here if your table/column names change.
    """
    conn, cur = _connect_sqlite()
    try:
        teachers = cur.execute(
            "SELECT SEM1_Staff_Initials FROM Subjectwise_result_1"
        ).fetchall()  # [(initials,), ...]
        students = cur.execute(
            "SELECT SUBJECT_CODE_USN, SUBJECT_CODE_Student_Name FROM SEM1"
        ).fetchall()  # [(usn, name), ...]
    finally:
        conn.close()
    return students, teachers


def _unique_teacher_username() -> str:
    """Generate an 8-digit teacher username that doesn't exist yet."""
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
    """Create accounts and return a downloadable CSV.

    Query param `mode`:
      - missing (default): only create users that don't exist yet
      - all: re-create all accounts (delete+create)
    """
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    mode = request.args.get("mode", "missing").lower()
    if mode not in {"missing", "all"}:
        return jsonify({"error": "Invalid mode. Use 'missing' or 'all'."}), 400

    students, teachers = _fetch_source_rows()

    # If re-creating ALL, wipe the tables first
    if mode == "all":
        # NOTE: If you have foreign keys, consider soft-deleting instead.
        User.query.delete()
        Teacher.query.delete()
        db.session.commit()

    out = io.StringIO()
    # Write header
    out.write("username,name,plain_password,password_hash,role\n")

    created_students = 0
    created_teachers = 0

    # Students
    for usn, name in students:
        if not usn:
            continue
        name = (name or "").strip()
        usn = str(usn).strip()

        # Skip if exists (missing mode)
        if mode == "missing" and User.query.filter_by(username=usn).first():
            continue

        plain = f"{_safe_seed(name)}{usn[-3:]}"
        pw_hash = bcrypt.generate_password_hash(password=plain).decode("utf-8")

        # In 'all' mode we already deleted; in 'missing' we should insert only if absent
        if mode == "all" or not User.query.filter_by(username=usn).first():
            db.session.add(User(username=usn, name=name, password=pw_hash))
            created_students += 1
            out.write(f"{usn},{name},{plain},{pw_hash},student\n")

    # Teachers
    for (teacher_name,) in teachers:
        teacher_name = (teacher_name or "").strip()

        # Pick/ensure a username
        username = _unique_teacher_username()

        plain = f"{_safe_seed(teacher_name)}{username[-3:]}"
        pw_hash = bcrypt.generate_password_hash(password=plain).decode("utf-8")

        # In missing mode we must ensure we don't duplicate by *name* either.
        if mode == "missing":
            exists_by_name = Teacher.query.filter_by(name=teacher_name).first()
            if exists_by_name:
                continue

        db.session.add(Teacher(username=username, name=teacher_name, password=pw_hash))
        created_teachers += 1
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
    """Accept .xlsx or .csv, save it to email_excel_path, and insert new StudentEmail rows."""
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename or "")
    if not filename:
        return jsonify({"error": "Invalid filename"}), 400

    # Decide how to save and read
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".xlsx", ".csv"}:
        return jsonify({"error": "Only .xlsx or .csv allowed"}), 400

    # Ensure directory exists
    target_dir = os.path.dirname(email_excel_path) or "."
    os.makedirs(target_dir, exist_ok=True)

    # Normalize save path to match configured email_excel_path (preserves basename)
    if ext == ".xlsx":
        save_path = email_excel_path
    else:  # .csv
        root, _ = os.path.splitext(email_excel_path)
        save_path = f"{root}.csv"

    # Save the uploaded file to disk as requested
    file.save(save_path)

    # Read into DataFrame
    try:
        if ext == ".xlsx":
            df = pd.read_excel(save_path)
        else:
            df = pd.read_csv(save_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 400

    # Validate columns
    required_cols = ["Student_USN", "Student_Name", "Parent_Email", "Student_Email"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(missing)}"}), 400

    # Insert new records (dedupe by USN)
    count_inserted = 0
    for _, row in df.iterrows():
        usn = str(row.get("Student_USN", "")).strip()
        name = str(row.get("Student_Name", "")).strip()
        parent_email = str(row.get("Parent_Email", "")).strip()
        student_email = str(row.get("Student_Email", "")).strip()

        if not usn:
            continue

        if not StudentEmail.query.filter_by(usn=usn).first():
            db.session.add(
                StudentEmail(
                    usn=usn,
                    name=name,
                    parent_email=parent_email,
                    student_email=student_email,
                )
            )
            count_inserted += 1

    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "emails_inserted": count_inserted,
            "file_saved_to": save_path,
        }
    )
