from flask import Blueprint, jsonify, request, send_file
import tempfile
import os
from utils.cloud import upload_excel_to_supabase, download_excel_from_supabase
from utils.helpers import get_batch_year
excel_bp = Blueprint("excel", __name__)

@excel_bp.route("/excel", methods=["POST"])
def excel():
    # Save file to temp directory
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    filename = file.filename or "uploaded.xlsx"
    batch_year = get_batch_year()

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        file.save(tmp.name)
        tmp.flush()
        # Upload to Supabase
        try:
            folder = f"{batch_year}"
            excel_name = f"result_list_{batch_year}.xlsx"
            cloud_url = upload_excel_to_supabase(tmp.name, excel_name, folder)
            message = "File uploaded successfully"
        except Exception as e:
            cloud_url = None
            message = f"File uploaded but cloud upload failed: {e}"

    # Clean up temp file
    try: os.remove(tmp.name)
    except Exception: pass

    return jsonify({"message": message, "excel_cloud_url": cloud_url})

@excel_bp.route("/excel/template.xlsx")
def get_template():
    batch_year = get_batch_year()
    excel_name = f"result_list_{batch_year}.xlsx"
    folder = f"{batch_year}"
    try:
        local_path = download_excel_from_supabase(excel_name, folder)
        return send_file(local_path, download_name=excel_name, as_attachment=True)
    except Exception as e:
        return jsonify({"error": f"Template not found: {e}"}), 404
