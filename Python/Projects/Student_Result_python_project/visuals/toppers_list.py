# import textwrap
# from reportlab.lib import colors
# from reportlab.platypus import SimpleDocTemplate, Table, TableStyle ,Paragraph, Spacer, Image
# from reportlab.lib.styles import getSampleStyleSheet
# from reportlab.lib.units import inch
from fpdf import FPDF
# from reportlab.lib.pagesizes import letter, landscape
# from reportlab.lib.pagesizes import A4
# from reportlab.pdfgen import canvas
import pathlib
from models.config import db_path, pdf_dir, img_dir, logo_path
# from models import SubjectResult
# from models.config import db_path

from fpdf.enums import XPos, YPos  # Import enums for positioning

def create_toppers_list_pdf(toppers, selected_semester, file_path=f"{pdf_dir}/toppers_list.pdf"):
    """
    Generates a PDF for the toppers list.

    Parameters:
        toppers (list): List of dictionaries containing toppers' details.
        selected_semester (str): The semester for which the toppers list is generated.
        file_path (str): The path where the PDF will be saved.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)  # Use Helvetica explicitly

    # Title
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(0, 10, f"Toppers List - {selected_semester}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(10)  # Add some vertical space

    # Table Header
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(10, 10, "No.", border=1, align="C")
    pdf.cell(40, 10, "USN", border=1, align="C")
    pdf.cell(80, 10, "Name", border=1, align="C")
    pdf.cell(30, 10, "Percentage", border=1, align="C")
    pdf.ln()

    # Table Rows
    pdf.set_font("Helvetica", size=12)
    for i, topper in enumerate(toppers, start=1):
        pdf.cell(10, 10, str(i), border=1, align="C")
        pdf.cell(40, 10, topper['usn'], border=1, align="C")
        pdf.cell(80, 10, topper['name'], border=1, align="L")
        pdf.cell(30, 10, f"{topper['percentage']:.2f}%", border=1, align="C")
        pdf.ln()

    # Save PDF
    pdf.output(file_path)
    print(f"Toppers list saved to {pathlib.Path(file_path).resolve()}")