# routes/pdf_routes.py
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from pathlib import Path
import zipfile
import rarfile
import threading
import tempfile
import shutil
import uuid
import shelve
import time
from models import pdftoexcel
from models.paths import excel_dir

pdftoexcel_bp = Blueprint("pdf", __name__, url_prefix="/pdf")

# Folder for final Excel files
EXCEL_FOLDER = excel_dir
EXCEL_FOLDER.mkdir(exist_ok=True)

# Temporary folder for uploads (won't trigger Flask reload)
UPLOAD_TEMP_FOLDER = Path(tempfile.gettempdir()) / "student_result_uploads"
UPLOAD_TEMP_FOLDER.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"zip", "rar"}
JOB_STORE_FILE = UPLOAD_TEMP_FOLDER / "job_store.db"

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_job(job_id, data):
    with shelve.open(str(JOB_STORE_FILE)) as db:
        db[job_id] = data

def load_job(job_id):
    with shelve.open(str(JOB_STORE_FILE)) as db:
        return db.get(job_id)

def process_archive_background(job_id, excel_filename, archive_path):
    tmpdir_path = Path(tempfile.mkdtemp(prefix="pdf_processing_"))
    job_data = {
        "status": "processing",
        "processed_files": [],
        "excel_path": None,
        "error": None,
        "progress": 0
    }
    save_job(job_id, job_data)

    try:
        # Extract archive
        try:
            if archive_path.suffix.lower() == ".zip":
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.extractall(tmpdir_path)
            elif archive_path.suffix.lower() == ".rar":
                with rarfile.RarFile(archive_path) as rar_ref:
                    rar_ref.extractall(tmpdir_path)
        except Exception as e:
            job_data.update({"status": "failed", "error": f"Extraction failed: {e}"})
            save_job(job_id, job_data)
            return

        # Process PDFs
        pdf_files = [f for f in tmpdir_path.iterdir() if f.suffix.lower() == ".pdf"]
        total_pdfs = len(pdf_files)

        for idx, pdf_file in enumerate(pdf_files, start=1):
            try:
                pdftoexcel.process_single_pdf(str(pdf_file), str(EXCEL_FOLDER / excel_filename))
            except Exception as e:
                logger.debug(f"⚠️ Failed to process {pdf_file.name}: {e}")
            job_data["processed_files"].append(pdf_file.name)
            job_data["progress"] = idx
            save_job(job_id, job_data)

        job_data.update({
            "status": "done",
            "excel_path": str(EXCEL_FOLDER / excel_filename)
        })
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
        threading.Thread(target=process_archive_background, args=(job_id, excel_filename, archive_path), daemon=True).start()

        return jsonify({
            "status": "processing",
            "job_id": job_id,
            "message": "Archive upload received. Poll job status to get progress."
        })

    return jsonify({"error": "Invalid file"}), 400

@pdftoexcel_bp.route("/job_status/<job_id>", methods=["GET"])
def job_status(job_id):
    job = load_job(job_id)
    if not job:
        return jsonify({"error": "Invalid job ID"}), 404
    return jsonify(job)
