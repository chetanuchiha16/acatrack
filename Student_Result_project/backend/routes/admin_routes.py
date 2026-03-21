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

import io
import os
import tempfile

from app_init import bcrypt
from flask import Blueprint, current_app, jsonify, request, send_file
from logger_config import get_logger
from models import Mentor, ParentAuth, StudentAuth, Teacher
from models.schema import ExportCache
from services.admin_service import process_email_upload_file
from sqlalchemy.orm import joinedload
from services.batch_manager import bm
from utils.cloud import upload_excel_to_supabase
from settings import settings
from werkzeug.utils import secure_filename


logger = get_logger(__name__)

# ---------- Blueprint ----------
admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _get_admin_secret() -> str:
    secret = settings.admin_secret or current_app.config.get("ADMIN_SECRET")
    if not secret:
        logger.critical("ADMIN_SECRET not configured!")
        # In a real app, you might want to raise an error here
        # but for now we'll just return a value that won't match anything
        return "NOT_CONFIGURED"
    return secret


def _check_secret(req) -> bool:
    provided = req.headers.get("X-Admin-Secret", "")
    return provided and provided == _get_admin_secret()


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
        batches = (
            bm.list_batches()
        )  # should return list of integers, e.g. [2022, 2023, 2024]
    except Exception:
        logger.exception("Failed to get batches")
        return jsonify({"error": "Failed to retrieve batch list."}), 500

    return jsonify({"batches": batches})


@admin_bp.route("/generate-accounts", methods=["POST"])
def generate_accounts():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    mode = request.args.get("mode", "missing").lower()
    if mode not in {"missing", "all"}:
        return jsonify({"error": "Invalid mode. Use 'missing' or 'all'."}), 400

    batch_year = int(request.args.get("batch_year", 2022))

    from services.admin_service import generate_accounts_csv

    csv_bytes, filename = generate_accounts_csv(mode, batch_year)

    return send_file(
        csv_bytes,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename,
    )


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

    result, status_code = process_email_upload_file(
        temp_upload_path,
        ext,
        batch_year,
        bm.session_scope,
        bcrypt,
        StudentAuth,
        ParentAuth,
        joinedload,
    )

    # Clean up temp file
    try:
        os.remove(temp_upload_path)
    except Exception as e:
        logger.debug(f"Temp file cleanup failed: {e}")

    return jsonify(result), status_code


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

    from services.admin_service import (
        process_mentor_upload_file,
        _unique_teacher_username,
        _safe_seed,
    )

    response, status_code = process_mentor_upload_file(
        file,
        batch_year,
        bm.session_scope,
        bcrypt,
        Mentor,
        Teacher,
        StudentAuth,
        _unique_teacher_username,
        _safe_seed,
        upload_excel_to_supabase,
    )

    return jsonify(response), status_code


@admin_bp.route("/download-teachers-csv", methods=["GET"])
def download_teachers_csv():
    if not _check_secret(request):
        return jsonify({"error": "Unauthorized"}), 401

    batch_year = int(request.args.get("batch_year", 0))

    with bm.session_scope(batch_year) as db:
        cache_entry = (
            db.session.query(ExportCache).filter_by(batch_year=batch_year).first()
        )
        if not cache_entry:
            return jsonify({"error": "No CSV available, please re-upload mentors"}), 404

        csv_content = cache_entry.csv_content

    return send_file(
        io.BytesIO(csv_content.encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"generated_teachers_batch_{batch_year}.csv",
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
    except Exception:
        logger.exception("Failed to create batch")
        return jsonify({"error": "Failed to create batch."}), 500


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
    except Exception:
        logger.exception("Failed to refresh batch")
        return jsonify({"error": "Failed to refresh batch data."}), 500
