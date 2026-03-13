import textwrap
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle ,Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from fpdf import FPDF
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import pathlib
from services.results_service import SubjectResult
from models.paths import pdf_dir,img_dir, get_logo_path
from services.fetch_service import sem_subjects
import io
from logger_config import get_logger

logger = get_logger(__name__)

styles = getSampleStyleSheet()
normal_style = styles["Normal"]

def generate_sem_pdf(selected_semester, university, semester_subject_mapping):
    try:
        subjects = semester_subject_mapping.get(selected_semester, [])
        if not subjects:
            raise ValueError("No subjects found for the selected semester.")
        
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)

        elements = []

        styles = getSampleStyleSheet()

       
        # Add logo
        try:
            logo = Image(get_logo_path(), width=50, height=50)  # Adjust size as needed
            elements.append(logo)
        except Exception as e:
            logger.debug(f"Warning: Could not load logo image. {e}")

         # Add college name
        title = Paragraph(f"<b>{"JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU"}</b>", styles['Title'])
        elements.append(title)


        # Add a gap
        elements.append(Spacer(1, 20))

        # Add semester title
        sem_title = Paragraph(f"<b>Semester-Wise Results: {selected_semester}</b>", styles['Heading2'])
        elements.append(sem_title)
        elements.append(Spacer(1, 12))

        headers = ["Subject Name", "Total Students", "Present", "Absent", "Pass %", "FCD", "FC", "SC", "Fail"]
        column_widths = [80, 90, 70, 70, 60, 50, 50, 50, 50]  # Adjust column widths to fit

        data = [headers]

        # Process each subject
        for subject_code in subjects:
            subject_result = SubjectResult(subject_code, selected_semester, university)
            subject_name = sem_subjects[selected_semester].get(subject_code, "unknown subject")
            row = [
                Paragraph(subject_name, normal_style),
                subject_result.total_students,
                subject_result.present_students,
                subject_result.absent_students,
                f"{subject_result.pass_percentage:.2f}%",
                subject_result.fcd_count,
                subject_result.fc_count,
                subject_result.sc_count,
                subject_result.fail_count,
            ]
            data.append(row)

        # Create the table
        table = Table(data, colWidths=column_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),  # Adjust font size for better fit
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(table)

        # Add totals summary
        elements.append(Spacer(1, 12))

        totals_headers = ["Total Students", "FCD", "FC", "SC", "Fail", "Pass %"]
        total_students = len([student for student in university.students if student.semester == selected_semester])
        total_fcd = sum(student.categorize() == "First Class with Distinction (FCD)" for student in university.students if student.semester == selected_semester)
        total_fc = sum(student.categorize() == "First Class (FC)" for student in university.students if student.semester == selected_semester)
        total_sc = sum(student.categorize() == "Second Class (SC)" for student in university.students if student.semester == selected_semester)
        total_fail = sum("Fail" in student.pass_fail for student in university.students if student.semester == selected_semester)
        total_present = total_students - total_fail
        pass_percentage = (total_present / total_students) * 100 if total_students > 0 else 0.0

        totals_data = [
            totals_headers,
            [
                total_students,
                total_fcd,
                total_fc,
                total_sc,
                total_fail,
                f"{pass_percentage:.2f}%",
            ],
        ]

        totals_table = Table(totals_data, colWidths=column_widths[:len(totals_headers)])
        totals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),  # Adjust font size
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 20))

        result = university.calculate_academic_performance_by_semester(selected_semester)
        toppers = sorted(result, key=lambda x: x['percentage'], reverse=True)[:10]  # Get top 10 students by percentage

        topper_title = Paragraph(f"<b> Toppers  {selected_semester}</b>", styles['Heading2'])
        elements.append(topper_title)
        elements.append(Spacer(1, 12))


        topper_headers = ["No", "USN", "Name", "Percentage"]
        column_widths = [80, 90, 130, 70]  # Adjust column widths to fit

        topper_data = [topper_headers]

        # Process each subject
        for i, topper in enumerate(toppers, start=1):
            
            row1 = [
                str(i),
                topper['usn'],
                topper['name'],
                round(topper['percentage'],2),
            ]
            topper_data.append(row1)

        # Create the table
        topper_table = Table(topper_data, colWidths=column_widths)
        topper_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),  # Adjust font size for better fit
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(topper_table)


        # Display failed students
        
        failed_students = university.find_failed_students_old(selected_semester)
        fail_title = Paragraph(f"<b> Slow Learners  {selected_semester}</b>", styles['Heading2'])
        elements.append(fail_title)
        elements.append(Spacer(1, 12))


        fail_headers = ["USN", "Subjects failed"]
        column_widths = [90, 400]  # Adjust column widths to fit

        fail_data = [fail_headers]

        for usn, failed_sub_codes in failed_students.items():
            subjects_str = ", ".join(failed_sub_codes)  # neat comma-separated string
            row2 = [
                usn,
                Paragraph(subjects_str,normal_style),
            ]
            fail_data.append(row2)

            

         # Create the table
        fail_table = Table(fail_data, colWidths=column_widths)
        fail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),  # Adjust font size for better fit
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(fail_table)


        # Build the PDF
        doc.build(elements)

        pdf_buffer.seek(0)       # <-- seek to beginning
        pdf_bytes = pdf_buffer.read()  # <-- read full content
        pdf_buffer.close()
        return pdf_bytes

    except Exception as e:
        logger.debug(f"Error generating PDF: {e}")