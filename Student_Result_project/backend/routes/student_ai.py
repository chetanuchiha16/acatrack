from extensions import cache
from flask import Blueprint, jsonify, request
from utils.helpers import get_batch_year
from services.student_ai_service import (
    get_ai_summary_data,
    get_ai_trend_data,
    get_ai_cgpa_prediction,
    get_ai_profile_data,
)

ai_bp = Blueprint("ai", __name__)


# ------------------ 1. AI Summary ------------------ #
@ai_bp.route("/ai/summary", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_summary():
    from markupsafe import escape
    usn = escape(request.args.get("usn", ""))
    lng = escape(request.args.get("lng", "en"))
    batch_year = get_batch_year()

    result, status_code = get_ai_summary_data(usn, lng, batch_year)
    return jsonify(result), status_code


# ------------------ 2. Trend Analysis ------------------ #
@ai_bp.route("/ai/trend", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_trend():
    from markupsafe import escape
    usn = escape(request.args.get("usn", ""))
    batch_year = get_batch_year()

    result, status_code = get_ai_trend_data(usn, batch_year)
    return jsonify(result), status_code


# ------------------ 3. Predict Final CGPA ------------------ #
@ai_bp.route("/ai/predict_cgpa", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_predict_cgpa():
    from markupsafe import escape
    usn = escape(request.args.get("usn", ""))

    result, status_code = get_ai_cgpa_prediction(usn)
    return jsonify(result), status_code


# ------------------ 4. Strength/Weakness Profile + Backlogs ------------------ #
@ai_bp.route("/ai/profile", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_profile():
    from markupsafe import escape
    usn = escape(request.args.get("usn", ""))
    lng = escape(request.args.get("lng", "en"))
    batch_year = get_batch_year()

    result, status_code = get_ai_profile_data(usn, lng, batch_year)
    return jsonify(result), status_code
