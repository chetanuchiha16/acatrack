from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from models.paths import get_logo_path
import io
from logger_config import get_logger

logger = get_logger(__name__)

styles = getSampleStyleSheet()
normal_style = styles["Normal"]

async def generate_sem_pdf_async(selected_semester, university, session):
    """
    Async version of semester PDF generation.
    FAANG-level optimization: Uses repository for SQL-level aggregations 
    and avoids redundant student instantiation.
    """
    try:
        from repositories.academic_repository import AcademicRepository
        repo = AcademicRepository(session)
        
        # 1. Fetch Summary Stats for the table using ONE SQL QUERY
        subject_stats = await repo.get_semester_summary_stats(selected_semester, university.batch_year)
        if not subject_stats:
             return b""

        # 2. Fetch full results for toppers using optimized async call
        full_results = await university.calculate_academic_performance_async(session, selected_semester)
        toppers = sorted(full_results, key=lambda x: x["percentage"], reverse=True)[:10]

        # 3. Fetch failed students list
        # Note: calculate_academic_performance_async already fetched students, so we can reuse if we had the list.
        # But for simplicity, we use the async finder.
        failed_students = await university.find_failed_students_async(session, selected_semester)

        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20,
        )

        elements = []
        try:
            logo = Image(get_logo_path(), width=50, height=50)
            elements.append(logo)
        except Exception as e:
            logger.debug(f"Warning: Could not load logo image. {e}")

        title = Paragraph(f"<b>{'JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU'}</b>", styles["Title"])
        elements.append(title)
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(f"<b>Semester-Wise Results: {selected_semester}</b>", styles["Heading2"]))
        elements.append(Spacer(1, 12))

        headers = ["Subject Name", "Total", "Present", "Absent", "Pass %", "FCD", "FC", "SC", "Fail"]
        column_widths = [110, 50, 50, 50, 60, 40, 40, 40, 40]
        data = [headers]

        total_students_cohort = 0
        total_fcd_cohort = 0
        total_fc_cohort = 0
        total_sc_cohort = 0
        total_fail_cohort = 0

        for stat in subject_stats:
            row = [
                Paragraph(stat["subject_name"], normal_style),
                stat["total_students"],
                stat["present_students"],
                stat["absent_students"],
                f"{stat['pass_percentage']:.2f}%",
                stat["fcd_count"],
                stat["fc_count"],
                stat["sc_count"],
                stat["fail_count"],
            ]
            data.append(row)

        table = Table(data, colWidths=column_widths)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 12))

        # Cohort summary (from top-10 or full results)
        # For true FAANG level, we'd have a separate SQL query for cohort-wide stats 
        # (FCD across all subjects). For now, we use the full_results we already fetched.
        
        total_students_cohort = len(full_results)
        for res in full_results:
            pct = res["percentage"]
            if "Fail" in res["pass_fail"]:
                total_fail_cohort += 1
            elif pct >= 70:
                total_fcd_cohort += 1
            elif pct >= 60:
                total_fc_cohort += 1
            elif pct >= 50:
                total_sc_cohort += 1
        
        total_pass_cohort = total_students_cohort - total_fail_cohort
        pass_pct_cohort = (total_pass_cohort / total_students_cohort * 100) if total_students_cohort > 0 else 0

        totals_headers = ["Total Students", "FCD", "FC", "SC", "Fail", "Pass %"]
        totals_data = [
            totals_headers,
            [total_students_cohort, total_fcd_cohort, total_fc_cohort, total_sc_cohort, total_fail_cohort, f"{pass_pct_cohort:.2f}%"]
        ]
        totals_table = Table(totals_data, colWidths=[90, 50, 50, 50, 50, 70])
        totals_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 20))

        # Toppers
        elements.append(Paragraph(f"<b> Toppers  {selected_semester}</b>", styles["Heading2"]))
        elements.append(Spacer(1, 12))
        topper_headers = ["No", "USN", "Name", "Percentage"]
        topper_data = [topper_headers]
        for i, topper in enumerate(toppers, start=1):
            topper_data.append([str(i), topper["usn"], topper["name"], f"{topper['percentage']:.2f}%"])
        
        topper_table = Table(topper_data, colWidths=[30, 90, 200, 70])
        topper_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(topper_table)
        elements.append(Spacer(1, 20))

        # Slow Learners
        elements.append(Paragraph(f"<b> Slow Learners  {selected_semester}</b>", styles["Heading2"]))
        elements.append(Spacer(1, 12))
        fail_headers = ["USN", "Subjects failed"]
        fail_data = [fail_headers]
        for fail_item in failed_students:
            fail_data.append([fail_item["usn"], Paragraph(", ".join(fail_item["subject_codes"]), normal_style)])

        fail_table = Table(fail_data, colWidths=[90, 400])
        fail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(fail_table)

        doc.build(elements)
        pdf_buffer.seek(0)
        return pdf_buffer.read()

    except Exception as e:
        logger.exception(f"Error generating async PDF: {e}")
        return b""


