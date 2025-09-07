from flask import Blueprint, request, jsonify, send_from_directory
from models import Mentor, StudentAuth
from models import Student  # reuse your existing Student class logic
from visuals import create_student_report
from models.paths import db_path, pdf_dir
import os
import io
import base64


mentor_bp = Blueprint('mentor', __name__)

@mentor_bp.route("/auth/Staff/Mentor/result", methods=["GET"])
def get_mentor_students():
    mentor_id = request.args.get("mentor_id")
    semester = request.args.get("semester")

    if not mentor_id or not semester:
        return jsonify({"error": "mentor_id and semester are required"}), 400

    try:
        mentor = Mentor.query.filter_by(id=mentor_id).first()
        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404

        students = StudentAuth.query.filter_by(mentor_id=mentor_id).all()
        results = []

        for s in students:
            try:
                student = Student(usn=s.username, semester=semester, db_path=db_path)

                # Keep exact filename as create_student_report uses it
                filename = f"{student.name}_{semester}_report.pdf"
                file_path = os.path.join(pdf_dir, filename)

                # ✅ generate PDF only if it doesn't exist
                if not os.path.exists(file_path):
                    create_student_report(student, file_path=file_path)
                    print(f"PDF created: {file_path}")
                else:
                    print(f"PDF exists: {file_path}, skipping generation")

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
                    "pdf_url": f"http://localhost:5000/auth/Staff/Mentor/report/{filename}"
                })

            except Exception as e:
                print(f"[WARNING] Student data not found for USN {s.username}: {e}")
                results.append({
                    "usn": s.username,
                    "error": "Student data not found"
                })

        return jsonify(results)

    except Exception as e:
        print(f"[ERROR] {e}")
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

    if not usn or not semester:
        return jsonify({"error": "usn and semester are required"}), 400

    try:
        student = Student(usn=usn, semester=semester, db_path=db_path)
        fig = student.plot_subject_marks()[0]
        # print("fig", fig) 
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")

        return jsonify({"image": f"data:image/png;base64,{img_base64}"})

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 400
