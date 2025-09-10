# routes/pdf_routes.py
from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from pathlib import Path
import zipfile
import rarfile  # pip install rarfile
from models import pdftoexcel
from models.paths import excel_dir

pdftoexcel_bp = Blueprint("pdf", __name__, url_prefix="/pdf")

UPLOAD_FOLDER = excel_dir
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {"zip", "rar"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@pdftoexcel_bp.route("/upload_archive", methods=["POST"])
def upload_archive():
    excel_filename = request.form.get("excel_filename")
    excel_path = pdftoexcel.process_pdfs(excel_filename, pdf_folder=UPLOAD_FOLDER)

    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        archive_path = UPLOAD_FOLDER / filename
        file.save(archive_path)
        print(f"Saved archive at: {archive_path}")

        # Extract files
        try:
            if filename.endswith(".zip"):
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.extractall(UPLOAD_FOLDER)
            elif filename.endswith(".rar"):
                with rarfile.RarFile(archive_path) as rar_ref:
                    rar_ref.extractall(UPLOAD_FOLDER)
            print(f"Extracted files: {os.listdir(UPLOAD_FOLDER)}")
        except Exception as e:
            print("Extraction failed:", e)
            return jsonify({"error": f"Failed to extract archive: {str(e)}"}), 500

        # Process all PDFs in folder
        try:
            excel_path = pdftoexcel.process_pdfs(excel_filename, pdf_folder=UPLOAD_FOLDER)
            print(f"Excel created at: {excel_path}")
        except Exception as e:
            print("PDF processing failed:", e)
            return jsonify({"error": f"PDF processing failed: {str(e)}"}), 500

        return jsonify({
            "status": "success",
            "excel_path": str(excel_path),
            "processed_files": [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(".pdf")]
        })

    return jsonify({"error": "Invalid file"}), 400
