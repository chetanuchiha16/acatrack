from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from pathlib import Path
import zipfile
import rarfile
import threading
import tempfile
import shutil
import uuid
import json
import re
from services import pdf_parser as pdftoexcel
from utils.cloud import (
    upload_pdf_to_supabase,
    upload_excel_to_supabase,
    download_excel_from_supabase,
    excel_exists_in_supabase,
)
from logger_config import get_logger

logger = get_logger(__name__)

pdftoexcel_bp = Blueprint("pdf", __name__, url_prefix="/pdf")
UPLOAD_TEMP_FOLDER = Path(tempfile.gettempdir()) / "student_result_uploads"
UPLOAD_TEMP_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {"zip", "rar"}

# Job status helpers (JSON files)
JOB_STATUS_DIR = Path(tempfile.gettempdir()) / "student_result_jobs"
JOB_STATUS_DIR.mkdir(exist_ok=True)


def save_job(job_id, data):
    with open(JOB_STATUS_DIR / f"job_{job_id}.json", "w") as f:
        json.dump(data, f)


def load_job(job_id):
    path = JOB_STATUS_DIR / f"job_{job_id}.json"
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def parse_batch_sem(archive_stem):
    """
    From something like '2023_SEM3' or '1JS23CS_SEM1', returns ("2023", "3")
    """
    m = re.match(r"(?P<batch>\d{4})_SEM(?P<sem>\d+)", archive_stem)
    if not m:
        m = re.match(r".*?(?P<batch>\d{4}).*SEM(?P<sem>\d+)", archive_stem)
    if m:
        return m.group("batch"), m.group("sem")
    else:
        return None, None


def extract_usn_from_filename(pdf_filename):
    return pdf_filename.split(".")[0]


def process_archive_background(job_id, excel_filename, archive_path):
    tmpdir_path = Path(tempfile.mkdtemp(prefix="pdf_processing_"))
    job_data = {
        "status": "processing",
        "processed_files": [],
        "excel_path": None,
        "error": None,
        "progress": 0,
    }
    save_job(job_id, job_data)
    try:
        try:
            if archive_path.suffix.lower() == ".zip":
                with zipfile.ZipFile(archive_path, "r") as zip_ref:
                    zip_ref.extractall(tmpdir_path)
            elif archive_path.suffix.lower() == ".rar":
                with rarfile.RarFile(archive_path) as rar_ref:
                    rar_ref.extractall(tmpdir_path)
        except Exception:
            logger.exception("Extraction failed")
            job_data.update({"status": "failed", "error": "Extraction failed. Please check the archive format."})
            save_job(job_id, job_data)
            return

        # Get batch and sem from archive name
        batch_year, sem = parse_batch_sem(archive_path.stem)
        if not batch_year or not sem:
            job_data.update(
                {
                    "status": "failed",
                    "error": "Could not parse batch/sem from archive name",
                }
            )
            save_job(job_id, job_data)
            return

        pdf_files = [f for f in tmpdir_path.iterdir() if f.suffix.lower() == ".pdf"]
        temp_excel_path = tmpdir_path / f"result_list_{batch_year}.xlsx"
        excel_supabase_folder = f"{batch_year}"
        excel_filename_final = f"result_list_{batch_year}.xlsx"

        # Download and use existing Excel if present (for merge/update)
        local_excel_path = temp_excel_path
        if excel_exists_in_supabase(excel_filename_final, excel_supabase_folder):
            downloaded_excel = download_excel_from_supabase(
                excel_filename_final, excel_supabase_folder
            )
            shutil.copy(downloaded_excel, local_excel_path)
            logger.debug(f"Downloaded existing Excel for update: {downloaded_excel}")

        # PDF processing and upload per student
        for idx, pdf_file in enumerate(pdf_files, start=1):
            try:
                pdftoexcel.process_single_pdf(str(pdf_file), str(local_excel_path))
            except Exception as e:
                logger.debug(f"⚠️ Failed to process {pdf_file.name}: {e}")
            usn = extract_usn_from_filename(pdf_file.name)
            pdf_supabase_folder = f"{batch_year}/{batch_year}_SEM{sem}"
            try:
                upload_pdf_to_supabase(str(pdf_file), f"{usn}.pdf", pdf_supabase_folder)
            except Exception as e:
                logger.debug(f"⚠️ Supabase PDF upload failed for {usn}: {e}")
            job_data["processed_files"].append(pdf_file.name)
            job_data["progress"] = idx
            save_job(job_id, job_data)

        # Upload the updated Excel back to Supabase
        try:
            excel_public_url = upload_excel_to_supabase(
                str(local_excel_path), excel_filename_final, excel_supabase_folder
            )
            job_data.update({"status": "done", "excel_path": excel_public_url})
        except Exception:
            logger.exception("Excel upload to Supabase failed")
            job_data.update(
                {"status": "failed", "error": "Failed to upload final Excel to cloud storage."}
            )
        save_job(job_id, job_data)
    finally:
        try:
            shutil.rmtree(tmpdir_path)
        except Exception as e:
            logger.debug(f"⚠️ Could not delete temp folder {tmpdir_path}: {e}")


@pdftoexcel_bp.route("/upload_archive", methods=["POST"])
def upload_archive():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    excel_filename = request.form.get("excel_filename")
    if not excel_filename:
        return jsonify({"error": "Missing excel_filename"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        archive_path = UPLOAD_TEMP_FOLDER / filename
        file.save(archive_path)
        job_id = uuid.uuid4().hex
        threading.Thread(
            target=process_archive_background,
            args=(job_id, excel_filename, archive_path),
            daemon=True,
        ).start()
        return jsonify(
            {
                "status": "processing",
                "job_id": job_id,
                "message": "Archive upload received. Poll job status to get progress.",
            }
        )
    return jsonify({"error": "Invalid file"}), 400


@pdftoexcel_bp.route("/job_status/<job_id>", methods=["GET"])
def job_status(job_id):
    job = load_job(job_id)
    if not job:
        return jsonify({"error": "Invalid job ID"}), 404
    return jsonify(job)
