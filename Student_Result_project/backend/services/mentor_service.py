import base64
import io
import matplotlib.pyplot as plt
from logger_config import get_logger
from services.student_service import Student
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
from services.batch_manager import bm
from visuals import create_student_report

logger = get_logger(__name__)

def get_mentor_students_data(mentor_id: str, semester: str, batch_year: int) -> tuple[list[dict], int, str]:
    if not mentor_id or not semester:
        return [], 400, "mentor_id and semester are required"

    try:
        with bm.session_scope(batch_year) as db:
            mentor_repo = MentorRepository(db.session)
            student_repo = StudentRepository(db.session)

            mentor = mentor_repo.get_by_id(mentor_id)
            if not mentor:
                return [], 404, "Mentor not found"

            students = student_repo.get_mentees_by_mentor_and_batch(mentor_id, batch_year)
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

                    results.append(
                        {
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
                                    "status": status,
                                }
                                for code, subject_name, ia, see, credit, status in zip(
                                    student.subject_codes,
                                    student.subject_names,
                                    student.ia_marks,
                                    student.see_marks,
                                    student.credits,
                                    student.pass_fail,
                                )
                            ],
                            "pdf_url": pdf_url,  # inline Base64 PDF
                        }
                    )

                except Exception as e:
                    logger.debug(
                        f"[WARNING] Student data not found for USN {s.usn}: {e}"
                    )
                    results.append({"usn": s.usn, "error": "Student data not found"})

            return results, 200, ""

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return [], 400, str(e)


def generate_mentee_chart_base64(usn: str, semester: str, batch_year: int) -> tuple[str, int, str]:
    if not usn or not semester:
        return "", 400, "usn and semester are required"

    try:
        with bm.session_scope(batch_year):
            # Create Student object
            student = Student(usn=usn, semester=semester, batch_year=batch_year)

            # Generate figure in memory
            fig = student.plot_subject_marks()

            # Convert figure to in-memory PNG
            buf = io.BytesIO()
            fig.savefig(buf, format="png")
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode("utf-8")

            # Close figure to free memory
            plt.close(fig)

            return f"data:image/png;base64,{img_base64}", 200, ""

    except Exception as e:
        logger.debug(f"[ERROR] {e}")
        return "", 400, str(e)
