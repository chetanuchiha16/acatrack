import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import pathlib
from models.paths import  pdf_dir, img_dir, logo_path
from io import BytesIO
from logger_config import get_logger

logger = get_logger(__name__)


def create_student_report(student):
    """
    Create a PDF report for a student in memory, return as bytes
    """
    buf = BytesIO()

    # Create PDF
    c = canvas.Canvas(buf, pagesize=letter)

    # College Name / Logo
    c.setFont("Helvetica-Bold", 16)
    c.drawString(150, 780, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")
    try:
        c.drawImage(logo_path, 50, 750, width=50, height=50)
    except Exception as e:
        logger.debug(f"Warning: Logo not loaded: {e}")

    # Student Info
    c.setFont("Helvetica", 12)
    c.drawString(50, 700, f"Name: {student.name}")
    c.drawString(50, 680, f"USN: {student.usn}")
    c.drawString(50, 660, f"Semester: {student.semester}")
    c.drawString(50, 640, f"Total Marks: {student.total_marks}")
    c.drawString(50, 620, f"Percentage: {student.percentage:.2f}%")
    c.drawString(50, 600, f"SGPA: {student.sgpa:.2f}")
    c.drawString(50, 580, f"CGPA: {student.cgpa:.2f}")

    # Subject Table
    y_position = 540
    line_spacing = 20
    for i, (subject_name, subject_code, ia, see, credit, status) in enumerate(
        zip(student.subject_names, student.subject_codes, student.ia_marks,
            student.see_marks, student.credits, student.pass_fail)
    ):
        c.drawString(50, y_position, str(i + 1))
        c.drawString(100, y_position, f"{subject_name} {subject_code}")
        c.drawString(300, y_position, str(ia))
        c.drawString(350, y_position, str(see))
        c.drawString(400, y_position, str(ia + see))
        c.drawString(450, y_position, str(credit))
        c.drawString(500, y_position, status)
        y_position -= line_spacing
        if y_position < 50:
            c.showPage()
            y_position = 750

    c.save()
    buf.seek(0)
    return buf.read()  # return PDF bytes