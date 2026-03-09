import base64
import io

from flask import Blueprint, jsonify, request, send_from_directory
from logger_config import get_logger
from models import Student
from models.helpers import get_batch_year
from models.paths import pdf_dir, postgres_db_url
from visuals import create_student_report

logger = get_logger(__name__)


student_bp = Blueprint("student", __name__)


# @student_bp.route("/api/student", methods=["GET"])
@student_bp.route("/auth/Student/result", methods=["GET"])
def get_student_info():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()
    logger.debug(f"batch year from student {batch_year}")
    logger.debug(f"Received USN: {usn}, Semester: {semester}, Batch: {batch_year}")

    try:
        # Initialize student using the new normalized model
        student = Student(
            usn=usn,
            semester=semester,
            batch_year=batch_year,
        )

        if not student.found:
            return jsonify({"error": "Student not found"}), 404

        # RESTORE PDF GENERATION
        # This calls your visual reporting logic using the new student object
        pdf_bytes = create_student_report(student)
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        pdf_url = f"data:application/pdf;base64,{pdf_base64}"

        # Get standard dictionary and inject the pdf_url
        response_data = student.to_dict()
        response_data["pdf_url"] = pdf_url

        return jsonify(response_data)

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 400


@student_bp.route("/auth/Student/report/<filename>", methods=["GET"])
def download_report(filename):
    return send_from_directory(pdf_dir, filename, as_attachment=True)


@student_bp.route("/auth/Student/chart", methods=["GET"])
def get_student_chart():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()

    student = Student(usn=usn, semester=semester, batch_year=batch_year)

    # Get Figure from Student module
    fig = student.plot_subject_marks()

    # Convert to base64 in-memory
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    # Close figure to free memory
    import matplotlib.pyplot as plt
    plt.close(fig)

    return jsonify({"image": f"data:image/png;base64,{img_base64}"})
