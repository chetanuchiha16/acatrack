from flask import Blueprint, jsonify, request, send_from_directory
from logger_config import get_logger
from utils.helpers import get_batch_year
from models.paths import pdf_dir
from services.mentor_service import (
    get_mentor_students_data,
    generate_mentee_chart_base64,
)

logger = get_logger(__name__)

mentor_bp = Blueprint("mentor", __name__)


@mentor_bp.route("/auth/Staff/Mentor/result", methods=["GET"])
def get_mentor_students():
    mentor_id = request.args.get("mentor_id")
    semester = request.args.get("semester")
    batch_year = request.args.get("batch_year") or get_batch_year()

    results, status_code, error_msg = get_mentor_students_data(
        mentor_id, semester, batch_year
    )

    if error_msg:
        return jsonify({"error": error_msg}), status_code

    return jsonify(results)


# Route to download mentee PDF reports
@mentor_bp.route("/auth/Staff/Mentor/report/<filename>", methods=["GET"])
def download_mentee_report(filename):
    return send_from_directory(pdf_dir, filename, as_attachment=True)


# Route to get chart of a specific mentee
@mentor_bp.route("/auth/Staff/Mentor/chart", methods=["GET"])
def get_mentee_chart():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = request.args.get("batch_year") or get_batch_year()

    image_url, status_code, error_msg = generate_mentee_chart_base64(
        usn, semester, batch_year
    )

    if error_msg:
        return jsonify({"error": error_msg}), status_code

    return jsonify({"image": image_url})
