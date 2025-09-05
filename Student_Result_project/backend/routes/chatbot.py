# student_report_blueprint.py
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from rapidfuzz import process, fuzz
from models.paths import db_path
from models.fetch import sem_subjects
from models.university import University

# ---------------- UNIVERSITY INIT ----------------
SEMESTERS = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"]
university = University(db_path=db_path)

for sem in SEMESTERS:
    try:
        university.add_students(selected_semester=sem)
    except TypeError as e:
        # Skip students that cause TypeError (like None marks)
        print(f"Skipping some students in {sem} due to error: {e}")
        continue

# ---------------- BLUEPRINT ----------------
chatbot_bp = Blueprint("student_report", __name__)

# ---------------- PDF GENERATION ----------------
def generate_pdf_report(student_data):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>Student Academic Report</b>", styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Student Name:</b> {student_data['student_name']}", styles['Heading2']))
    story.append(Spacer(1, 12))

    for sem, data in student_data['semesters'].items():
        story.append(Paragraph(f"<b>{sem}</b>", styles['Heading2']))
        story.append(Paragraph(f"SGPA: {data['sgpa']}, CGPA: {data['cgpa']:.2f}, Percentage: {data['percentage']:.2f}%, Credits Obtained: {data['obtained_credits']}", styles['Normal']))
        table_data = [["Subject","Internal","External","Total","Credits","Result"]]
        for s_name, s_code, ia, see, credit, status in zip(
            data["subject_names"], data["subject_codes"],
            data["ia_marks"], data["see_marks"], data["credits"], data["pass_fail"]
        ):
            total = ia + see
            table_data.append([f"{s_name} ({s_code})", ia, see, total, credit, status])
        table = Table(table_data, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ADD8E6')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('ALIGN', (0,0), (-1,-1), 'CENTER')
        ]))
        story.append(table)
        story.append(Spacer(1,12))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_backlog_pdf(student_name, backlogs, total_credits):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>Backlog Report - {student_name}</b>", styles['Title']))
    story.append(Spacer(1,12))

    if not backlogs:
        story.append(Paragraph("<font color='green'><b>✅ No backlogs found.</b></font>", styles['Normal']))
    else:
        story.append(Paragraph("<font color='red'><b>⚠️ Student has backlogs!</b></font>", styles['Normal']))
        story.append(Spacer(1,12))
        if total_credits > 18:
            story.append(Paragraph("<font color='red'><b>⚠️ Backlog credits exceed 18. Risk of year back.</b></font>", styles['Normal']))
            story.append(Spacer(1,12))

        for sem, subjects in backlogs.items():
            story.append(Paragraph(f"<b>{sem}</b>", styles['Heading2']))
            table_data = [["Subject","Internal","External","Credits"]]
            for s in subjects:
                table_data.append([s.get("subject","N/A"), s.get("internal",0), s.get("external",0), s.get("credits",0)])
            table = Table(table_data, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),colors.red),
                ('TEXTCOLOR',(0,0),(-1,0),colors.white),
                ('GRID',(0,0),(-1,-1),0.5,colors.black),
                ('ALIGN',(0,0),(-1,-1),'CENTER')
            ]))
            story.append(table)
            story.append(Spacer(1,12))

        story.append(Paragraph(f"<b>Total Backlog Credits:</b> {total_credits}", styles['Normal']))

    doc.build(buffer)
    buffer.seek(0)
    return buffer


# ---------------- HELPERS ----------------
def fetch_student_data_from_university():
    """
    Fetch all student data from University instance and return as dict:
    {
        student_name_lower: {
            'student_name': ...,
            'semesters': { semester: { ... } }
        }
    }
    """
    data_map = {}

    for student in university.students:
        student_name_key = student.name.lower()

        # Initialize student entry if not exists
        if student_name_key not in data_map:
            data_map[student_name_key] = {
                "student_name": student.name,
                "semesters": {}
            }

        # Replace None marks with 0
        ia_marks = [m if m is not None else 0 for m in student.ia_marks]
        see_marks = [m if m is not None else 0 for m in student.see_marks]

        # Add this semester data
        data_map[student_name_key]["semesters"][student.semester] = {
            "usn": student.usn,
            "name": student.name,
            "ia_marks": ia_marks,
            "see_marks": see_marks,
            "total_marks": student.total_marks,
            "credits": student.credits,
            "obtained_credits": student.obtained_credits,
            "sgpa": student.sgpa,
            "cgpa": student.cgpa,
            "percentage": student.percentage,
            "pass_fail": student.pass_fail,
            "subject_names": student.subject_names,
            "subject_codes": student.subject_codes,
            "category": student.categorize()
        }

    return data_map



def _calculate_backlogs(student_data):
    backlogs = {}
    total_credits = 0.0
    for sem, subjects in student_data.get("semesters", {}).items():
        failed = []
        for s in subjects:
            try:
                external = float(s.get("external") or 0)
                credits = float(s.get("credits") or 0)
            except:
                continue
            if external != 0 and external < 18:
                failed.append(s)
                total_credits += credits
        if failed:
            backlogs[sem] = failed
    return backlogs, total_credits

def _fuzzy_find_student(name, students, cutoff=70):
    lowered_map = {s.lower(): s for s in students}
    match = process.extractOne(name.lower(), list(lowered_map.keys()), scorer=fuzz.token_sort_ratio, score_cutoff=cutoff)
    return lowered_map[match[0]] if match else None

# ---------------- ROUTES ----------------
@chatbot_bp.route("/students", methods=["GET"])
def list_students():
    students_data = fetch_student_data_from_university()
    students_list = []

    for student_name, data in students_data.items():
        # Only show the latest semester info for summary
        latest_sem = list(data["semesters"].keys())[-1]
        sem_data = data["semesters"][latest_sem]

        students_list.append({
            "student_name": data["student_name"],
            "latest_semester": latest_sem,
            "sgpa": sem_data["sgpa"],
            "cgpa": sem_data["cgpa"],
            "percentage": sem_data["percentage"],
            "category": sem_data["category"]
        })

    return jsonify({"students": students_list})


@chatbot_bp.route("/report/<student_query>", methods=["GET"])
def get_student_report(student_query):
    students = fetch_student_data_from_university()
    matched_name = _fuzzy_find_student(student_query, students.keys())
    if not matched_name:
        return jsonify({"error": "Student not found"}), 404
    
    student_data = students[matched_name]
    student_semesters = student_data["semesters"]

    # Calculate backlogs across all semesters
    backlogs = {}
    total_backlog_credits = 0
    for sem, data in student_semesters.items():
        sem_backlogs = []
        for ia, see, credit, subject, status in zip(
            data["ia_marks"], data["see_marks"], data["credits"],
            data["subject_names"], data["pass_fail"]
        ):
            if status == "Fail":
                sem_backlogs.append({
                    "subject": subject,
                    "internal": ia,
                    "external": see,
                    "credits": credit
                })
                total_backlog_credits += credit
        if sem_backlogs:
            backlogs[sem] = sem_backlogs

    return jsonify({
        "student_name": student_data["student_name"],
        "semesters": student_semesters,
        "backlogs": backlogs,
        "total_backlog_credits": total_backlog_credits
    })


@chatbot_bp.route("/report/<student_query>/pdf", methods=["GET"])
def download_pdf_report(student_query):
    students = fetch_student_data_from_university()
    matched_name = _fuzzy_find_student(student_query, students.keys())
    
    if not matched_name:
        return jsonify({"error": "Student not found"}), 404

    student_data = students[matched_name]
    report_type = request.args.get("type", "full")

    if report_type == "backlog":
        backlogs, total_credits = _calculate_backlogs(student_data)
        pdf_buffer = generate_backlog_pdf(
            student_data["student_name"], backlogs, total_credits
        )
        filename = f"{student_data['student_name'].replace(' ', '_')}_Backlog_Report.pdf"
    else:
        pdf_buffer = generate_pdf_report(student_data)
        filename = f"{student_data['student_name'].replace(' ', '_')}_Semester_Report.pdf"

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )


