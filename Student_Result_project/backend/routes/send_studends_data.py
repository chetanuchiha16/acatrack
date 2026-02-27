from flask import Blueprint, request, jsonify, send_from_directory, session
from models import Student
from visuals import create_student_report
from models.paths import pdf_dir  , get_db_path
import os
from models.helpers import get_batch_year
from sqlalchemy import create_engine
from models.paths import postgres_db_url, API_BASE
from logger_config import get_logger

logger = get_logger(__name__)


student_bp = Blueprint('student', __name__)

# @student_bp.route("/api/student", methods=["GET"])
@student_bp.route("/auth/Student/result", methods=["GET"])
def get_student_info():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()   
    logger.debug(f"batch year from student {batch_year}")
    logger.debug(f"Received USN: {usn}, Semester: {semester}, Batch: {batch_year}")

    try:
        # Get DB engine
        engine = create_engine(postgres_db_url)
        student = Student(usn=usn, semester=semester, batch_year=batch_year, engine=engine)

        # Generate PDF in-memory
        pdf_bytes = create_student_report(student)  # returns bytes
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        # Keep the same key so frontend doesn’t change
        pdf_url = f"data:application/pdf;base64,{pdf_base64}"

        return jsonify({
            "name": student.name,
            "usn": student.usn,
            "total_marks": int(student.total_marks),
            "percentage": float(student.percentage),
            "credits": int(student.obtained_credits),
            "sgpa": float(student.sgpa),
            "cgpa": float(student.cgpa),
            "subjects": [
                {
                    "subject_name": subject_name,
                    "code": code,
                    "ia": int(ia),
                    "see": int(see),
                    "total": int(ia + see),
                    "credit": int(credit),
                    "status": status
                }
                for code, subject_name, ia, see, credit, status in zip(
                    student.subject_codes, student.subject_names, student.ia_marks, student.see_marks,
                    student.credits, student.pass_fail
                )
            ],
            "pdf_url": pdf_url  # base64 inline PDF
        })

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 400


@student_bp.route("/auth/Student/report/<filename>", methods=["GET"])
def download_report(filename):
    return send_from_directory(pdf_dir, filename, as_attachment=True)

import io
import base64

@student_bp.route("/auth/Student/chart", methods=["GET"])
def get_student_chart():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()   

    engine = create_engine(postgres_db_url)
    student = Student(usn=usn, semester=semester, batch_year=batch_year, engine=engine)

    # Get Figure from Student module
    fig = student.plot_subject_marks()

    # Convert to base64 in-memory
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    # Close figure to free memory
    fig.clf()
    fig.canvas.flush_events()
    
    return jsonify({"image": f"data:image/png;base64,{img_base64}"})

