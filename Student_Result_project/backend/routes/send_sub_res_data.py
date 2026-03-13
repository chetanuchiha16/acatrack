from flask import Flask, request, jsonify, send_file, Blueprint, session
from models import University, SubjectResult
from models.paths import  pdf_dir, postgres_db_url
from visuals import create_subject_report
import os
from utils.helpers import get_batch_year
from logger_config import get_logger
from extensions import cache

logger = get_logger(__name__)

sub_bp = Blueprint('sub_res', __name__)

@sub_bp.route('/auth/Staff/sub_res', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)
def get_subject_results():
    semester = request.args.get('semester')
    subject_code = request.args.get('subject')
    batch_year = request.args.get('batch_year') or get_batch_year()   
    if not semester or not subject_code:
        return jsonify({"error": "semester and subject are required"}), 400
    
    university = University(postgres_url=postgres_db_url, batch_year=batch_year)
    subject_result = SubjectResult(subject_code, semester, university)

    result_data = subject_result.get_subject_results_dict()

    return jsonify(result_data)

@sub_bp.route('/auth/Staff/sub_res/report', methods=['GET'])
def get_subject_report_pdf():
    token = request.headers.get("Authorization")
    logger.debug("DEBUG: Authorization header =", token)
    batch_year = request.args.get('batch_year') or get_batch_year()
    semester = request.args.get('semester')
    subject_code = request.args.get('subject')

    if not semester or not subject_code:
        return jsonify({"error": "semester and subject are required"}), 400

    university = University(postgres_url=postgres_db_url, batch_year=batch_year)
    subject_result = SubjectResult(subject_code, semester, university)

    # ✅ Generate PDF in-memory
    pdf_bytes = create_subject_report(subject_result)
    from io import BytesIO
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)

    return send_file(pdf_buffer, as_attachment=True, download_name=f"subject_report_{semester}_{subject_code}.pdf", mimetype="application/pdf")

