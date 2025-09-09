from flask import Blueprint, request, jsonify
from threading import Thread
import os
import time

from models import pdftoexcel

pdftoexcel_bp = Blueprint("pdftoexcel", __name__, url_prefix="/pdftoexcel")

# ---------------- Status Store ----------------
TASK_STATUS = {
    "running": False,
    "last_run": None,
    "last_message": None,
    "last_error": None,
    "excel_path": None,
}


# ---------------- Helpers ----------------
def _process_pdfs(pdf_folder, excel_path):
    TASK_STATUS.update({
        "running": True,
        "last_run": time.strftime("%Y-%m-%d %H:%M:%S"),
        "last_message": f"Started processing PDFs in {pdf_folder}",
        "last_error": None,
        "excel_path": excel_path
    })

    try:
        result_excel = pdftoexcel.process_pdfs(pdf_folder, excel_path)

        TASK_STATUS.update({
            "running": False,
            "last_message": f"✅ Excel updated and saved at {result_excel}",
            "last_error": None,
            "excel_path": result_excel,
        })

    except Exception as e:
        TASK_STATUS.update({
            "running": False,
            "last_message": "❌ Failed",
            "last_error": str(e),
        })


# ---------------- Routes ----------------
@pdftoexcel_bp.route("/convert", methods=["POST"])
def convert_pdfs_to_excel():
    """
    Expects JSON:
    {
        "pdf_folder": "VTU_Results/DJ24",
        "excel_path": "VTU_Results/result list project.xlsx"
    }
    """
    data = request.json or {}
    pdf_folder = data.get("pdf_folder", pdftoexcel.pdf_folder)
    excel_path = data.get("excel_path", pdftoexcel.excel_path)

    if not os.path.exists(pdf_folder):
        return jsonify({"error": f"PDF folder does not exist: {pdf_folder}"}), 400

    thread = Thread(target=_process_pdfs, args=(pdf_folder, excel_path))
    thread.start()

    return jsonify({
        "status": "started",
        "message": f"Processing PDFs in '{pdf_folder}' → '{excel_path}'",
        "pdf_folder": pdf_folder,
        "excel_path": excel_path
    })


@pdftoexcel_bp.route("/status", methods=["GET"])
def get_status():
    """Check the status of the last PDF → Excel conversion"""
    return jsonify(TASK_STATUS)
