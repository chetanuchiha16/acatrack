from flask import Blueprint, request, jsonify, send_from_directory, session
from models import Student
from visuals import create_student_report
from models.paths import pdf_dir  , get_db_path
import os
from models.helpers import get_batch_year
from sqlalchemy import create_engine


student_bp = Blueprint('student', __name__)

# @student_bp.route("/api/student", methods=["GET"])
@student_bp.route(f"/auth/Student/result", methods=["GET"])
def get_student_info():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()   
    print(f"batch year from student {batch_year}")

    print(f"Received USN: {usn}, Semester: {semester}, Batch: {batch_year}")


    try:
        # db_path = get_db_path(batch_year)  # <-- resolves correct DB
        engine = create_engine("postgresql+psycopg2://chetan:chetan@localhost:5433/Group_Project")
        student = Student(usn=usn, semester=semester, batch_year=batch_year, engine=engine)

        # Generate PDF
        filename = f"{student.name}_{semester}_report.pdf"
        file_path = os.path.join(pdf_dir, filename)
        create_student_report(student, file_path=file_path)

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
                for code,subject_name, ia, see, credit, status in zip(
                    student.subject_codes, student.subject_names, student.ia_marks, student.see_marks,
                    student.credits, student.pass_fail
                )
            ],
            "pdf_url": f"http://localhost:5000/auth/Student/report/{filename}"
        })

    except Exception as e:
        print(f"[ERROR] {e}")
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
    db_path = get_db_path(batch_year)  # <-- resolves correct DB
    student = Student(usn=usn, semester=semester, db_path=db_path)
    fig = student.plot_subject_marks()[0]

    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    return jsonify({ "image": f"data:image/png;base64,{img_base64}" })
