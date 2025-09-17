# student_service.py
from models import Student
from visuals import create_student_report
from models.paths import db_path, pdf_dir
import os

def get_student_result(usn: str, semester: str):
    """
    Returns student result as dictionary (same structure as /result API)
    """
    student = Student(usn=usn, semester=semester, db_path=db_path)

    # Generate PDF (optional, can skip if only analysis needed)
    filename = f"{student.name}_{semester}_report.pdf"
    file_path = os.path.join(pdf_dir, filename)
    create_student_report(student, file_path=file_path)
    pdf_url = f"http://localhost:5000/auth/Student/report/{filename}"

    result = {
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
                student.subject_codes, student.subject_names, student.ia_marks, student.see_marks,
                student.credits, student.pass_fail
            )
        ],
        "pdf_url": pdf_url
    }
    return result
