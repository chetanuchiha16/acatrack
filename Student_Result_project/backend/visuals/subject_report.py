import matplotlib.pyplot as plt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import pathlib
from models.config import db_path, pdf_dir, img_dir, logo_path
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
# from models.config import db_path
def create_subject_report(subject_result, file_path=f"{pdf_dir}/subject_report.pdf"):
    """
    Create a PDF report for subject-wise performance with graphs.
    """
    # Generate a graph for subject-wise pass/fail count
    labels = ['Pass', 'Fail']
    counts = [subject_result.pass_count, subject_result.fail_count]
    fig, ax = plt.subplots()
    ax.bar(labels, counts, color=['green', 'red'])
    ax.set_title(f"Performance in {subject_result.subject_code}")
    ax.set_ylabel("Number of Students")
    graph_path = f"{img_dir}/subject_graph.png"
    plt.savefig(graph_path)
    plt.close()

    # Get the pie chart images for performance and attendance
    perpath = subject_result.plot_performance_pie_chart()[1]
    attpath = subject_result.plot_attendance_pie_chart()[1]

    # Create the PDF
    c = canvas.Canvas(file_path, pagesize=letter)
    
    # Add College Name and Logo
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")
    
    try:
        # Add logo to the top left
        logo = Image(logo_path, width=50, height=50)
        c.drawImage(logo_path, 50, 735, width=50, height=50)
    except Exception as e:
        print(f"Warning: Could not load logo image. {e}")
    
    # Title for Subject Report
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 715, f"Subject Report for {subject_result.subject_code} ({subject_result.semester})")

    # Insert the bar chart for performance
    c.drawImage(graph_path, 100, 500, width=400, height=200)
    
    # Insert pie charts for performance and attendance
    c.drawImage(perpath, 100, 300, width=200, height=200)
    c.drawImage(attpath, 300, 300, width=200, height=200)

    # Insert the subject performance data
    c.setFont("Helvetica", 12)
    c.drawString(100, 280, f"Total Students: {subject_result.total_students}")
    c.drawString(100, 260, f"Present: {subject_result.present_students} Absent: {subject_result.absent_students}")
    c.drawString(100, 240, f"Pass: {subject_result.pass_count}, Fail: {subject_result.fail_count}")
    c.drawString(100, 220, f"Pass Percentage: {subject_result.pass_percentage:.2f}%")
    c.drawString(100, 200, f"FCD (>70%): {subject_result.fcd_count}")
    c.drawString(100, 180, f"FC (60-70%): {subject_result.fc_count}")
    c.drawString(100, 160, f"SC (50-60%): {subject_result.sc_count}")
    
    # Save the PDF
    c.save()
    print(f"Subject Report PDF saved successfully as {pathlib.Path(file_path).resolve()}")