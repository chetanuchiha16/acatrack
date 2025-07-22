import matplotlib.pyplot as plt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import pathlib
from models.config import db_path, pdf_dir, img_dir, logo_path

def create_student_report(student, file_path=f"{pdf_dir}/student_report.pdf"):
    """
    Create a PDF report for an individual student with graphs, resembling a marks card.
    """
    # Generate a graph for subject-wise marks
    fig, ax = plt.subplots()
    ax.bar(student.subject_codes, [ia + see for ia, see in zip(student.ia_marks, student.see_marks)], color="#5E40BE")
    ax.set_title(f"Performance of {student.name}")
    ax.set_xlabel("Subjects")
    ax.set_ylabel("Total Marks")
    graph_path = f"{img_dir}/student_graph.png"
    plt.savefig(graph_path)
    plt.close()

    # Create the PDF
    c = canvas.Canvas(file_path, pagesize=letter)

    # Add College Name and Logo
    c.setFont("Helvetica-Bold", 16)
    c.drawString(150, 780, "JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU")  # Centered title
    try:
        c.drawImage(logo_path, 50, 750, width=50, height=50)  # Add logo on the top-left
    except Exception as e:
        print(f"Warning: Could not load logo image. {e}")

    # Add Report Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 730, f"Student Marks Card")
    c.line(50, 720, 550, 720)  # Add a horizontal line below the header

    # Add Student Details
    c.setFont("Helvetica", 12)
    c.drawString(50, 700, f"Name: {student.name}")
    c.drawString(50, 680, f"USN: {student.usn}")
    c.drawString(50, 660, f"Semester: {student.semester}")
    c.drawString(50, 640, f"Total Marks: {student.total_marks}")
    c.drawString(50, 620, f"Percentage: {student.percentage:.2f}%")
    c.drawString(50, 600, f"SGPA: {student.sgpa:.2f}")
    c.drawString(50, 580, f"CGPA: {student.cgpa:.2f}")

    # Add Subject-wise Results Table
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 560, "Subject-wise Results:")
    y_position = 540
    c.setFont("Helvetica", 10)
    c.drawString(50, y_position, "Sl.No")
    c.drawString(100, y_position, "Subject Code")
    c.drawString(200, y_position, "IA Marks")
    c.drawString(300, y_position, "SEE Marks")
    c.drawString(400, y_position, "Total Marks")
    c.drawString(500, y_position, "Credits")
    c.drawString(550, y_position, "Status")
    y_position -= 20
    c.line(50, y_position + 10, 550, y_position + 10)  # Horizontal line for table header

    line_spacing = 20
    for i, (subject_code, ia, see, credit, status) in enumerate(
        zip(student.subject_codes, student.ia_marks, student.see_marks, student.credits, student.pass_fail)
    ):
        c.drawString(50, y_position, str(i + 1))
        c.drawString(100, y_position, subject_code)
        c.drawString(200, y_position, str(ia))
        c.drawString(300, y_position, str(see))
        c.drawString(400, y_position, str(ia + see))
        c.drawString(500, y_position, str(credit))
        c.drawString(550, y_position, status)
        y_position -= line_spacing

        # Start a new page if space runs out
        if y_position < 50:
            c.showPage()
            c.setFont("Helvetica", 10)  # Reset font
            y_position = 750  # Reset position for the new page

    # Add Performance Graph
    c.drawImage(graph_path, 100, 100, width=400, height=200)
    # Finalize PDF
    c.save()
    print(f"Student Marks Card PDF saved successfully as {pathlib.Path(file_path).resolve()}")