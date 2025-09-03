from models import Mentor, StudentAuth
from models import Student
from models.paths import db_path, pdf_dir
from visuals import create_student_report
from flask import Blueprint, request, jsonify, send_from_directory
import os, io, base64

mentor_bp = Blueprint('mentor', __name__)

# Route to get all mentees' results for a given mentor
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

        # ✅ get students directly from StudentAuth (new design)
        students = StudentAuth.query.filter_by(mentor_id=mentor_id).all()

        results = []

        for s in students:
            try:
                student = Student(usn=s.username, semester=semester, db_path=db_path)

                filename = f"{student.name}_{semester}_report.pdf"
                file_path = os.path.join(pdf_dir, filename)
                create_student_report(student, file_path=file_path)

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
