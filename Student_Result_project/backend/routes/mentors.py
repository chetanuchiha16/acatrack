from flask import Blueprint, request, jsonify, send_from_directory, session
from models import Mentor, StudentAuth
from models import Student  # reuse your existing Student class logic
from visuals import create_student_report
from models.paths import  pdf_dir, postgres_db_url, API_BASE
import os
import io
import base64
from models.batch_manager import BatchManager, bm
from models.helpers import get_batch_year
from sqlalchemy import create_engine
from logger_config import get_logger

logger = get_logger(__name__)

mentor_bp = Blueprint('mentor', __name__)

@mentor_bp.route("/auth/Staff/Mentor/result", methods=["GET"])
def get_mentor_students():
    mentor_id = request.args.get("mentor_id")
    semester = request.args.get("semester")
    batch_year = get_batch_year()
    engine = create_engine(postgres_db_url)

    if not mentor_id or not semester:
        return jsonify({"error": "mentor_id and semester are required"}), 400

    try:
        with bm.session_scope(batch_year) as db:
            mentor = Mentor.query.filter_by(id=mentor_id).first()
            if not mentor:
                return jsonify({"error": "Mentor not found"}), 404

            students = StudentAuth.query.filter_by(mentor_id=mentor_id, batch_year=batch_year).all()
            usns = [s.usn for s in students]
            bulk_students = Student.bulk_fetch(usns, semester, batch_year)
            results = []

            for s in students:
                try:
                    student = bulk_students.get(s.usn)
                    if not student:
                        raise ValueError(f"No student data found for USN {s.usn}")

                    # Generate PDF in memory
                    pdf_bytes = create_student_report(student)  # returns bytes
                    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
                    pdf_url = f"data:application/pdf;base64,{pdf_base64}"

                    results.append({
                        "name": student.name,
                        "usn": student.usn,
                        "total_marks": student.total_marks,
                        "percentage": student.percentage,
                        "credits": student.obtained_credits,
                        "sgpa": student.sgpa,
                        "cgpa": student.cgpa,
                        "subjects": [
                            {
                                "subject_name": subject_name,
                                "code": code,
                                "ia": ia,
                                "see": see,
                                "total": ia + see,
                                "credit": credit,
                                "status": status
                            }
                            for code, subject_name, ia, see, credit, status in zip(
                                student.subject_codes, student.subject_names,
                                student.ia_marks, student.see_marks,
                                student.credits, student.pass_fail
                            )
                        ],
                        "pdf_url": pdf_url  # inline Base64 PDF
                    })

                except Exception as e:
                    logger.debug(f"[WARNING] Student data not found for USN {s.usn}: {e}")
                    results.append({
                        "usn": s.usn,
                        "error": "Student data not found"
                    })

            return jsonify(results)

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 400




# Route to download mentee PDF reports
@mentor_bp.route("/auth/Staff/Mentor/report/<filename>", methods=["GET"])
def download_mentee_report(filename):
    return send_from_directory(pdf_dir, filename, as_attachment=True)


# Route to get chart of a specific mentee
@mentor_bp.route("/auth/Staff/Mentor/chart", methods=["GET"])
def get_mentee_chart():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()
    engine = create_engine(postgres_db_url)

    if not usn or not semester:
        return jsonify({"error": "usn and semester are required"}), 400

    try:
        with bm.session_scope(batch_year) as db:
            # Create Student object
            student = Student(usn=usn, semester=semester, batch_year=batch_year, engine=engine)

            # Generate figure in memory
            fig = student.plot_subject_marks()

            # Convert figure to in-memory PNG
            buf = io.BytesIO()
            fig.savefig(buf, format="png")
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode("utf-8")

            # Close figure to free memory
            fig.clf()
            fig.canvas.flush_events()

            # Return inline Base64 image
            return jsonify({"image": f"data:image/png;base64,{img_base64}"})

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 400

