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
        subject_stats = await repo.get_semester_summary_stats(
            selected_semester, university.batch_year
        )
        if not subject_stats:
            return b""

        # 2. Fetch toppers using optimized SQL-level sort
        toppers = await repo.get_toppers_by_percentage(
            selected_semester, university.batch_year
        )

        # 3. Fetch cohort aggregate stats using SQL
        cohort_stats = await repo.get_semester_cohort_stats(
            selected_semester, university.batch_year
        )

        # 4. Fetch failed students list using optimized SQL query
        failed_students = await repo.get_semester_failed_students(
            selected_semester, university.batch_year
        )

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

        title = Paragraph(
            f"<b>{'JSS ACADEMY OF TECHNICAL EDUCATION, BENGALURU'}</b>", styles["Title"]
        )
        elements.append(title)
        elements.append(Spacer(1, 20))
        elements.append(
            Paragraph(
                f"<b>Semester-Wise Results: {selected_semester}</b>", styles["Heading2"]
            )
        )
        elements.append(Spacer(1, 12))

        headers = [
            "Subject Name",
            "Total",
            "Present",
            "Absent",
            "Pass %",
            "FCD",
            "FC",
            "SC",
            "Fail",
        ]
        column_widths = [110, 50, 50, 50, 60, 40, 40, 40, 40]
        data = [headers]

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
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(table)
        elements.append(Spacer(1, 12))

        # Cohort summary from SQL stats
        totals_headers = ["Total Students", "FCD", "FC", "SC", "Fail", "Pass %"]
        totals_data = [
            totals_headers,
            [
                cohort_stats["total_students"],
                cohort_stats["total_fcd"],
                cohort_stats["total_fc"],
                cohort_stats["total_sc"],
                cohort_stats["total_fail"],
                f"{cohort_stats['pass_percentage']:.2f}%",
            ],
        ]
        totals_table = Table(totals_data, colWidths=[90, 50, 50, 50, 50, 70])
        totals_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        elements.append(totals_table)
        elements.append(Spacer(1, 20))

        # Toppers
        elements.append(
            Paragraph(f"<b> Toppers  {selected_semester}</b>", styles["Heading2"])
        )
        elements.append(Spacer(1, 12))
        topper_headers = ["No", "USN", "Name", "Percentage"]
        topper_data = [topper_headers]
        for i, topper in enumerate(toppers, start=1):
            topper_data.append(
                [str(i), topper["usn"], topper["name"], f"{topper['percentage']:.2f}%"]
            )

        topper_table = Table(topper_data, colWidths=[30, 90, 200, 70])
        topper_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        elements.append(topper_table)
        elements.append(Spacer(1, 20))

        # Slow Learners
        elements.append(
            Paragraph(f"<b> Slow Learners  {selected_semester}</b>", styles["Heading2"])
        )
        elements.append(Spacer(1, 12))
        fail_headers = ["USN", "Subjects failed"]
        fail_data = [fail_headers]
        for fail_item in failed_students:
            fail_data.append(
                [
                    fail_item["usn"],
                    Paragraph(", ".join(fail_item["subject_codes"]), normal_style),
                ]
            )

        fail_table = Table(fail_data, colWidths=[90, 400])
        fail_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(fail_table)

        doc.build(elements)
        pdf_buffer.seek(0)
        return pdf_buffer.read()

    except Exception as e:
        logger.exception(f"Error generating async PDF: {e}")
        return b""
