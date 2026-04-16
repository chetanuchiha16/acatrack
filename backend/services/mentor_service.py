import io
import matplotlib.pyplot as plt
import asyncio
from logger_config import get_logger
from services.student_service import Student
from repositories.student_repository import StudentRepository
from repositories.mentor_repository import MentorRepository
import base64
logger = get_logger(__name__)


async def get_mentor_students_data(
    session, mentor_id: str, semester: str, batch_year: int
) -> tuple[list[dict], int, str]:
    if not mentor_id or not semester:
        return [], 400, "mentor_id and semester are required"

    try:
        mentor_repo = MentorRepository(session)
        student_repo = StudentRepository(session)

        mentor = await mentor_repo.get_by_id(mentor_id)
        if not mentor:
            return [], 404, "Mentor not found"

        students = await student_repo.get_mentees_by_mentor_and_batch(
            mentor_id, batch_year
        )
        if not students:
            return [], 200, ""

        usns = [s.usn for s in students]
        bulk_students_list = await Student.bulk_fetch_async(
            session, usns, semester, batch_year
        )
        bulk_students = {s.usn: s for s in bulk_students_list}

        async def _process_student(s):
            try:
                student = bulk_students.get(s.usn)
                if not student:
                    raise ValueError(f"No student data found for USN {s.usn}")

                return {
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
                }

            except Exception as e:
                logger.debug(f"[WARNING] Student data not found for USN {s.usn}: {e}")
                return {"usn": s.usn, "error": "Student data not found"}

        tasks = [_process_student(s) for s in students]
        results = await asyncio.gather(*tasks)

        return results, 200, ""

    except Exception as e:
        logger.error(f"[ERROR] get_mentor_students_data: {e}")
        return [], 400, "Failed to retrieve student data"


async def generate_mentee_chart_base64(
    session, usn: str, semester: str, batch_year: int
) -> tuple[str, int, str]:
    if not usn or not semester:
        return "", 400, "usn and semester are required"

    try:
        # Create Student object asynchronously
        student = await Student.create_async(
            session, usn=usn, semester=semester, batch_year=batch_year
        )

        # Generate figure in memory
        fig = await asyncio.get_event_loop().run_in_executor(
            None, student.plot_subject_marks
        )

        # Convert figure to in-memory PNG
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")

        # Close figure to free memory
        plt.close(fig)

        return f"data:image/png;base64,{img_base64}", 200, ""

    except Exception as e:
        logger.error(f"[ERROR] generate_mentee_chart_base64: {e}")
        return "", 400, "Failed to generate chart"
