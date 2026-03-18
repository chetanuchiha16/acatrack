from flask import Blueprint, jsonify, request
from utils.helpers import get_batch_year
from services.student_analysis_service import analyze_student_performance

student_api_bp = Blueprint("student_api", __name__)


@student_api_bp.route("/auth/Student/analysis", methods=["GET"])
def get_student_analysis():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()

    if not usn or not semester:
        return jsonify({"error": "USN and semester are required"}), 400

    try:
        analysis = analyze_student_performance(usn, semester, batch_year=batch_year)

        # Optionally remove 'study_tips' to avoid confusion
        analysis.pop("study_tips", None)

        # Ensure frontend has 'study_summary'
        if "study_summary" not in analysis:
            analysis["study_summary"] = "Focus on overall improvement."

        return jsonify(analysis)
    except Exception:
        return jsonify({"error": "Failed to perform student analysis."}), 500
