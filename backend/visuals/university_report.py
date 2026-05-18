# import textwrap
# from reportlab.lib import colors
# from reportlab.lib.styles import getSampleStyleSheet
# from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter

# from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

# from services.results_service import SubjectResult
# from models.config import
import matplotlib

matplotlib.use("Agg")
from models.paths import img_dir, get_logo_path
from logger_config import get_logger

logger = get_logger(__name__)


async def create_university_report_async(
    university, selected_semester, session, section_name=None
):
    """
    Async version of university report generation.
    FAANG-level optimization: Avoid redundant fetches and use async I/O.
    """
    import io
    import uuid
    import os

    pdf_buffer = io.BytesIO()

    # Fetch students once
    students = await university.get_students_for_semester_async(
        session, selected_semester, section_name
    )
    if not students:
        logger.debug(f"No students found for {selected_semester}")
        return b""

    # Generate SGPA histogram - still CPU bound, but we run in executor
    sgpa_list = [student.sgpa for student in students]

    def _plot_sgpa():
        from matplotlib.figure import Figure

        fig = Figure()
        ax = fig.add_subplot(111)
        ax.hist(sgpa_list, bins=10, range=(0, 10), color="skyblue", edgecolor="black")
        ax.set_title("SGPA Distribution")
        ax.set_xlabel("SGPA")
        ax.set_ylabel("Number of Students")
        path = f"{img_dir}/university_graph_{uuid.uuid4().hex}.png"
        fig.savefig(path)
        return path

    import asyncio

    graph_path = await asyncio.get_event_loop().run_in_executor(None, _plot_sgpa)

    # Generate second graph using the async method and passing students list
    _, gpath = await university.plot_student_totals_async(
        session, selected_semester, mode="histogram", n=10, bins=10, students=students
    )

    # Create PDF in-memory
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 730, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")
    try:
        c.drawImage(get_logo_path(), 50, 710, width=50, height=50)
    except Exception as e:
        logger.debug(f"Warning: Could not load logo image. {e}")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 680, f"University Report for {selected_semester}")

    c.drawImage(graph_path, 100, 500, width=400, height=200)
    if gpath:
        c.drawImage(gpath, 100, 300, width=400, height=200)

    c.setFont("Helvetica", 12)
    c.drawString(
        100, 270, f"=== Academic Performance for Semester: {selected_semester} ==="
    )

    y = 250
    for student in students:
        y -= 20
        if y < 100:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = 750

        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"USN: {student.usn} | Name: {student.name}")
        y -= 15

        c.setFont("Helvetica", 12)
        details = (
            f"Total Marks: {student.total_marks}\n"
            f"Percentage: {student.percentage:.2f}%\n"
            f"SGPA: {student.sgpa:.2f}, CGPA: {student.cgpa:.2f}\n"
            f"Pass/Fail Status: {student.pass_fail}\n"
        )

        for line in details.split("\n"):
            if y < 100:
                c.showPage()
                c.setFont("Helvetica", 12)
                y = 750
            c.drawString(50, y, line.strip())
            y -= 15

    c.save()
    pdf_buffer.seek(0)
    pdf_data = pdf_buffer.read()
    pdf_buffer.close()

    # Cleanup
    if os.path.exists(graph_path):
        os.remove(graph_path)
    if gpath and os.path.exists(gpath):
        os.remove(gpath)

    return pdf_data
