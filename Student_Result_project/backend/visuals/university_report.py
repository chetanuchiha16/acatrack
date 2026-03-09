# import textwrap
# from reportlab.lib import colors
from reportlab.platypus import Image
# from reportlab.lib.styles import getSampleStyleSheet
# from reportlab.lib.units import inch
from fpdf import FPDF
from reportlab.lib.pagesizes import letter
# from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import pathlib
# from models import SubjectResult
# from models.config import 
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from models.paths import  pdf_dir, img_dir, logo_path
from logger_config import get_logger

logger = get_logger(__name__)


def create_university_report(university, selected_semester):
    """
    Create a PDF report for the university's academic performance with graphs.
    Returns PDF bytes (in-memory).
    """
    import io
    pdf_buffer = io.BytesIO()

    # Fetch students for the selected semester
    students = university.get_students_for_semester(selected_semester)
    if not students:
        logger.debug(f"No students found for {selected_semester}")
        return b"" # Or handle error appropriately

    # Generate SGPA histogram
    sgpa_list = [student.sgpa for student in students]
    fig, ax = plt.subplots()
    ax.hist(sgpa_list, bins=10, range=(0, 10), color='skyblue', edgecolor='black')
    ax.set_title("SGPA Distribution")
    ax.set_xlabel("SGPA")
    ax.set_ylabel("Number of Students")
    import uuid
    graph_path = f"{img_dir}/university_graph_{uuid.uuid4().hex}.png"
    plt.savefig(graph_path)
    plt.close()

    # Generate second graph
    gpath = university.plot_student_totals(selected_semester, mode='histogram', n=10, bins=10)[1]

    # Create PDF in-memory
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import Image

    c = canvas.Canvas(pdf_buffer, pagesize=letter)

    # College Name & Logo
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 730, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")
    try:
        c.drawImage(logo_path, 50, 710, width=50, height=50)
    except Exception as e:
        logger.debug(f"Warning: Could not load logo image. {e}")

    # Title
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 680, f"University Report for {selected_semester}")

    # Insert charts
    c.drawImage(graph_path, 100, 500, width=400, height=200)
    if gpath:
        c.drawImage(gpath, 100, 300, width=400, height=200)

    # Add student details
    c.setFont("Helvetica", 12)
    c.drawString(100, 270, f"=== Academic Performance for Semester: {selected_semester} ===")

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

        y -= 20
        if y < 100:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = 750

    c.save()
    pdf_buffer.seek(0)
    pdf_bytes = pdf_buffer.read()
    pdf_buffer.close()
    
    import os
    if os.path.exists(graph_path):
        os.remove(graph_path)
    if gpath and os.path.exists(gpath):
        os.remove(gpath)
        
    return pdf_bytes
