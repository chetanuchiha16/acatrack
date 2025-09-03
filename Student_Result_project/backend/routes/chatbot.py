# student_report_blueprint.py
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
import sqlite3, os, re
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from rapidfuzz import process, fuzz
from models.paths import db_path
from models.fetch import sem_subjects

chatbot_bp = Blueprint("student_report", __name__)
SEMESTERS = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"]

# ---------------- PDF Generation ----------------
def generate_pdf_report(student_data):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>Student Academic Report</b>", styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Student Name:</b> {student_data['student_name']}", styles['Heading2']))
    story.append(Spacer(1, 12))

    for sem, subjects in student_data['semester_results'].items():
        story.append(Paragraph(f"<b>{sem}</b>", styles['Heading2']))
        table_data = [["Subject","Internal","External","Total","Credits","Result"]]
        for s in subjects:
            internal = s.get("internal") or 0
            external = s.get("external") or 0
            credits = s.get("credits") or 0
            try:
                result = "Pass" if (float(internal) >= 18 and float(external) >= 18) or external==0 else "Fail"
            except:
                result = "N/A"
            table_data.append([s.get("subject","N/A"), internal, external, s.get("total","N/A"), credits, result])

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

# ---------------- Backlog PDF ----------------
def generate_backlog_pdf(student_name, backlogs, total_credits):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>Backlog Report - {student_name}</b>", styles['Title']))
    story.append(Spacer(1,12))

    if not backlogs:
        story.append(Paragraph("<font color='green'><b>⚠️ No backlogs found.</b></font>", styles['Normal']))
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

    doc.build(story)
    buffer.seek(0)
    return buffer

# ---------------- Helpers ----------------
def fetch_student_data_from_db():
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file '{db_path}' not found.")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    data_map = {}

    for sem in SEMESTERS:
        try:
            cursor.execute(f"SELECT * FROM {sem}")
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            internal_cols = [c for c in columns if c.endswith("_INTERNALS")]
            subjects = [re.sub("_INTERNALS$","",c) for c in internal_cols]

            for row in rows:
                row_dict = dict(zip(columns, row))
                student_name_raw = str(row_dict.get("student_name","")).strip()
                student_name_key = student_name_raw.lower()
                if not student_name_key:
                    continue

                if student_name_key not in data_map:
                    data_map[student_name_key] = {"student_name": student_name_raw, "semester_results": {}}

                if sem not in data_map[student_name_key]["semester_results"]:
                    data_map[student_name_key]["semester_results"][sem] = []

                for subj in subjects:
                    data_map[student_name_key]["semester_results"][sem].append({
                        "subject": sem_subjects.get(sem, {}).get(subj,"Unknown"),
                        "internal": row_dict.get(f"{subj}_INTERNALS"),
                        "external": row_dict.get(f"{subj}_EXTERNALS"),
                        "total": row_dict.get(f"{subj}_TOTAL"),
                        "credits": row_dict.get(f"{subj}_CREDITS")
                    })
        except sqlite3.OperationalError:
            continue

    conn.close()
    return data_map

def _calculate_backlogs(student_data):
    backlogs = {}
    total_credits = 0.0
    for sem, subjects in student_data.get("semester_results", {}).items():
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

# ---------------- Routes ----------------
@chatbot_bp.route("/students", methods=["GET"])
def list_students():
    try:
        students = sorted(fetch_student_data_from_db().keys())
        return jsonify({"students": students})
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

@chatbot_bp.route("/report/<student_query>", methods=["GET"])
def get_student_report(student_query):
    students = fetch_student_data_from_db()
    matched_name = _fuzzy_find_student(student_query, students.keys())
    if not matched_name:
        return jsonify({"error":"Student not found"}),404
    student_data = students[matched_name]
    backlogs, total_credits = _calculate_backlogs(student_data)
    return jsonify({
        "student_name": student_data["student_name"],
        "semester_results": student_data["semester_results"],
        "backlogs": backlogs,
        "total_backlog_credits": total_credits
    })

@chatbot_bp.route("/report/<student_query>/pdf", methods=["GET"])
def download_pdf_report(student_query):
    students = fetch_student_data_from_db()
    matched_name = _fuzzy_find_student(student_query, students.keys())
    if not matched_name:
        return jsonify({"error":"Student not found"}),404
    student_data = students[matched_name]
    report_type = request.args.get("type","full")
    if report_type=="backlog":
        backlogs, total_credits = _calculate_backlogs(student_data)
        pdf_buffer = generate_backlog_pdf(student_data["student_name"], backlogs, total_credits)
        filename = f"{student_data['student_name'].replace(' ','_')}_Backlog_Report.pdf"
    else:
        pdf_buffer = generate_pdf_report(student_data)
        filename = f"{student_data['student_name'].replace(' ','_')}_Semester_Report.pdf"

    return send_file(pdf_buffer, mimetype="application/pdf", as_attachment=True, download_name=filename)
