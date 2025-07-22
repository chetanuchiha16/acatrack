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
import matplotlib.pyplot as plt
from models.config import db_path, pdf_dir, img_dir, logo_path

def create_university_report(university, selected_semester, file_path=f"{pdf_dir}/university_report.pdf"):
    """
    Create a PDF report for the university's academic performance with graphs.
    """
    # Generate a graph for SGPA distribution
    sgpa_list = [student.sgpa for student in university.students if student.semester == selected_semester]
    fig, ax = plt.subplots()
    ax.hist(sgpa_list, bins=10, range=(0, 10), color='skyblue', edgecolor='black')
    ax.set_title("SGPA Distribution")
    ax.set_xlabel("SGPA")
    ax.set_ylabel("Number of Students")
    graph_path = f"{img_dir}/university_graph.png"
    plt.savefig(graph_path)
    plt.close()

    # Generate the second graph
    gpath = university.plot_student_totals(selected_semester, mode='histogram', n=10, bins=10)[1]

    # Create the PDF
    c = canvas.Canvas(file_path, pagesize=letter)

    # Add College Name and Logo
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 730, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")
    
    try:
        # Add logo to the top left
        logo = Image(logo_path, width=50, height=50)
        c.drawImage(logo_path, 50, 710, width=50, height=50)
    except Exception as e:
        print(f"Warning: Could not load logo image. {e}")

    # Title for University Report
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 680, f"University Report for {selected_semester}")

    # Insert the bar chart for SGPA distribution
    c.drawImage(graph_path, 100, 500, width=400, height=200)

    # Insert the second chart
    c.drawImage(gpath, 100, 300, width=400, height=200)

    # Add a header for student details
    c.setFont("Helvetica", 12)
    c.drawString(100, 270, f"=== Academic Performance for Semester: {selected_semester} ===")

    y = 250  # Start below the chart area
    for student in university.students:
        if student.semester == selected_semester:
            y -= 20  # Start below the previous paragraph or reset for a new page

            if y < 100:  # Check if there's enough space; if not, start a new page
                c.showPage()
                c.setFont("Helvetica", 12)
                y = 750  # Reset y position for the new page

            # Add the student's details in a paragraph-style format
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, f"USN: {student.usn} | Name: {student.name}")
            y -= 15  # Reduced space between student header and details

            c.setFont("Helvetica", 12)
            details = (
                f"Total Marks: {student.total_marks}\n"
                f"Percentage: {student.percentage:.2f}%\n"
                f"SGPA: {student.sgpa:.2f}, CGPA: {student.cgpa:.2f}\n"
                f"Pass/Fail Status: {student.pass_fail}\n"
            )

            # Split the details into lines and render them
            for line in details.split("\n"):
                if y < 100:  # Start a new page if space runs out
                    c.showPage()
                    c.setFont("Helvetica", 12)
                    y = 750

                c.drawString(50, y, line.strip())
                y -= 15  # Reduced spacing between lines

            y -= 20  # Reduced space before the next student's details

            if y < 100:  # Start a new page if there's not enough space for the next student
                c.showPage()
                c.setFont("Helvetica", 12)
                y = 750

    # Save the PDF
    c.save()
    print(f"University Report PDF saved successfully as {pathlib.Path(file_path).resolve()}")
