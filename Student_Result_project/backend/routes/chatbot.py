# student_report_blueprint.py
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from rapidfuzz import process, fuzz
from collections import defaultdict
from models.paths import db_path
from models.fetch import sem_subjects
from models.university import University
from transformers import pipeline
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge


# ---------------- UNIVERSITY INIT ----------------
SEMESTERS = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"]
university = University(db_path=db_path)

for sem in SEMESTERS:
    try:
        university.add_students(selected_semester=sem)
    except TypeError as e:
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
        story.append(Paragraph(
            f"SGPA: {data['sgpa']}, CGPA: {data['cgpa']:.2f}, Percentage: {data['percentage']:.2f}%, Credits Obtained: {data['obtained_credits']}",
            styles['Normal']
        ))
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

    doc.build(story)
    buffer.seek(0)
    return buffer


# ---------------- HELPERS ----------------
def fetch_student_data_from_university():
    data_map = {}
    for student in university.students:
        student_name_key = student.name.lower()
        if student_name_key not in data_map:
            data_map[student_name_key] = {"student_name": student.name, "semesters": {}}
        ia_marks = [m if m is not None else 0 for m in student.ia_marks]
        see_marks = [m if m is not None else 0 for m in student.see_marks]
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

    for sem, data in student_data.get("semesters", {}).items():
        sem_backlogs = []
        for ia, see, credit, subject, status in zip(
            data.get("ia_marks", []),
            data.get("see_marks", []),
            data.get("credits", []),
            data.get("subject_names", []),
            data.get("pass_fail", [])
        ):
            if status == "Fail":
                sem_backlogs.append({
                    "subject": subject,
                    "internal": ia,
                    "external": see,
                    "credits": credit
                })
                total_credits += credit

        if sem_backlogs:
            backlogs[sem] = sem_backlogs

    return backlogs, total_credits


def _fuzzy_find_student(name, students, cutoff=70):
    lowered_map = {s.lower(): s for s in students}
    match = process.extractOne(name.lower(), list(lowered_map.keys()), scorer=fuzz.token_sort_ratio, score_cutoff=cutoff)
    return lowered_map[match[0]] if match else None

def get_latest_semester(student_data):
    valid_sems = [sem for sem, data in student_data.get("semesters", {}).items() if data.get("sgpa") is not None]
    return valid_sems[-1] if valid_sems else None

def safe_marks(marks):
    return [m if m is not None else 0 for m in marks or []]

def get_student_history(student_data):
    return [(sem, data["sgpa"]) for sem, data in sorted(student_data.get("semesters", {}).items()) if data.get("sgpa") is not None]


# ---------------- Adaptive AI helpers ----------------
# A small, extendable keyword map for detecting subject tags
SUBJECT_TAG_KEYWORDS = {
    "programming": [
        "programming", "data structures", "algorithms", "dsa", "software", "coding", "java", "python", "c++", "c"
    ],
    "math": [
        "math", "mathematics", "discrete", "calculus", "statistics", "probability", "linear algebra"
    ],
    "data": [
        "data", "database", "dbms", "data mining", "data science", "machine learning", "ai", "artificial intelligence"
    ],
    "electronics": [
        "electronics", "circuit", "microcontroller", "analog", "digital", "signal", "embedded"
    ],
    "networking": [
        "network", "communication", "tcp", "udp", "routing", "networking"
    ],
    "management": [
        "management", "economics", "accounts", "business", "marketing", "management studies"
    ],
    "communication": [
        "english", "communication", "soft skills", "interpersonal"
    ],
}




def tag_subject_auto(subject):
    """
    Return a list of tags for a subject using fuzzy matching on keywords.
    """
    if not subject:
        return []
    s = subject.lower()
    tags = []
    for tag, keywords in SUBJECT_TAG_KEYWORDS.items():
        for kw in keywords:
            # If keyword is substring, accept immediately. Else use fuzzy threshold.
            if kw in s:
                tags.append(tag)
                break
            score = fuzz.token_sort_ratio(s, kw)
            if score >= 70:
                tags.append(tag)
                break
    return list(set(tags))

def aggregate_tag_scores(student_data):
    """
    Aggregate subject totals by tag across all semesters and return:
      - tag_avgs: average total marks per tag
      - tag_counts: counts per tag
      - subject_tags: mapping subject -> tags (best effort)
    """
    tag_totals = defaultdict(float)
    tag_counts = defaultdict(int)
    subject_tags = {}

    for sem, data in student_data.get("semesters", {}).items():
        ia = safe_marks(data.get("ia_marks"))
        see = safe_marks(data.get("see_marks"))
        subs = data.get("subject_names", [])
        for sub, ia_m, see_m in zip(subs, ia, see):
            total = (ia_m or 0) + (see_m or 0)
            tags = tag_subject_auto(sub)
            subject_tags[sub] = tags
            if not tags:
                tag_totals["other"] += total
                tag_counts["other"] += 1
            else:
                for t in tags:
                    tag_totals[t] += total
                    tag_counts[t] += 1

    tag_avgs = {}
    for t, tot in tag_totals.items():
        cnt = tag_counts.get(t, 1)
        tag_avgs[t] = round(tot / max(1, cnt), 2)
    return tag_avgs, dict(tag_counts), subject_tags

def classify_tag_strengths(tag_avgs):
    """
    Return three lists: strong (>=70), mid (40-69.99), weak (<40)
    Operating on averaged total marks (max possible depends on local scheme, but we keep thresholds as earlier logic).
    """
    strong, mid, weak = [], [], []
    for tag, avg in tag_avgs.items():
        if avg >= 70:
            strong.append(tag)
        elif avg >= 40:
            mid.append(tag)
        else:
            weak.append(tag)
    return strong, mid, weak

def predict_next_sgpa_with_confidence(history):
    """
    Fit a simple regularized time-series model (Ridge on semester index).
    Return predicted next SGPA, 95% CI (low, high) and model info.
    If history too short, return None.
    """
    if not history or len(history) < 2:
        return None

    sems, sgpas = zip(*history)
    X = np.arange(1, len(sgpas) + 1).reshape(-1, 1)
    y = np.array(sgpas, dtype=float)

    # Regularized linear fit to reduce overfitting on tiny sequences
    model = Ridge(alpha=1.0)
    model.fit(X, y)
    next_x = np.array([[len(sgpas) + 1]])
    pred = float(model.predict(next_x)[0])

    # residuals & simple uncertainty estimate
    y_pred = model.predict(X)
    resid = y - y_pred
    if len(resid) > 1:
        resid_std = float(resid.std(ddof=1))
    else:
        # fallback small uncertainty
        resid_std = max(0.25, abs(y[0] - pred))

    ci_radius = 1.96 * resid_std
    low = max(0.0, pred - ci_radius)
    high = min(10.0, pred + ci_radius)  # assuming SGPA scale <= 10
    return {
        "predicted_next_sgpa": round(pred, 2),
        "ci_low": round(low, 2),
        "ci_high": round(high, 2),
        "model": "ridge",
        "resid_std": round(resid_std, 3)
    }

def build_placement_and_skill_advice(strong_tags, mid_tags, weak_tags, trend_data, cgpa_pred, total_backlog_credits):
    """
    Generate human-friendly advice strings using tag strengths, trend, predicted CGPA and backlog info.
    """
    advice = []
    learning_plan = []

    # Placement suggestions by tag
    if "programming" in strong_tags:
        advice.append("Strong in programming → Good fit for software/coding internships. Focus on DSA, system design basics, and personal projects.")
        learning_plan.append("Practice on coding platforms (DSA), contribute to small projects, build 2-3 demonstrable projects.")
    elif "programming" in mid_tags:
        advice.append("Programming is moderate → strengthen algorithms & projects to target coding roles.")
        learning_plan.append("Daily DSA practice (1–2 problems), small project focusing on implementation and debugging.")
    elif "programming" in weak_tags:
        advice.append("Programming is weak → start with fundamentals (syntax, basic algorithms) and small exercises.")
        learning_plan.append("Beginner tutorials + practice problems, pair-programming, small guided projects.")

    if "data" in strong_tags:
        advice.append("Good data-oriented skills → consider analytics/data science roles; learn SQL, pandas, and basic ML pipelines.")
        learning_plan.append("Work on data cleaning, SQL queries, mini-ML projects and Kaggle beginner challenges.")
    if "math" in strong_tags:
        advice.append("Strong mathematical foundation → suitable for analytics, research or systems roles requiring quantitative reasoning.")
        learning_plan.append("Practice probability/statistics & linear algebra applied to ML/algorithms.")

    if total_backlog_credits > 0:
        advice.append("Clear backlogs soon — many recruiters shortlist based on clear academic records.")
        learning_plan.append("Prioritise backlog clearance and short-term revision plans for failed subjects.")

    # Trend-based advice
    if trend_data:
        if trend_data.get("trend") == "Declining":
            advice.append("SGPA trend is Declining — identify root causes (attendance, exam prep, fundamentals).")
            learning_plan.append("Strengthen fundamentals for weak topics, structured weekly study plan, and seek mentoring or extra classes.")
        else:
            advice.append("SGPA trend is Improving — maintain study routine and strengthen project-based learning.")

    # CGPA-based realistic positioning
    if cgpa_pred:
        final_cgpa = cgpa_pred.get("predicted_final_cgpa") or cgpa_pred.get("predicted_final_cgpa", None)
        # if predicted_final_cgpa is present
        if isinstance(final_cgpa, (int, float)):
            if final_cgpa >= 7.5:
                advice.append("Predicted CGPA is competitive for campus placements at mid-large companies; focus on interview prep & projects.")
            elif final_cgpa >= 6.0:
                advice.append("Predicted CGPA is decent — target internships, niche roles and strengthen practical skills & projects.")
            else:
                advice.append("Predicted CGPA is low — aim for internships, upskilling courses, and consider certification-based skill proof.")

    # generic suggestions for weak tags
    for t in weak_tags:
        if t == "communication":
            learning_plan.append("Work on communication: mock interviews, presentation practice, and resume polish.")
        else:
            learning_plan.append(f"Review fundamentals for {t}, use guided courses and hands-on mini-projects.")

    # dedupe while preserving order
    def dedupe(lst):
        seen = set()
        out = []
        for x in lst:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    return dedupe(advice), dedupe(learning_plan)


# ---------------- ROUTES ----------------
@chatbot_bp.route("/students", methods=["GET"])
def list_students():
    students_data = fetch_student_data_from_university()
    students_list = []
    for student_name, data in students_data.items():
        latest_sem = get_latest_semester(data)
        sem_data = data["semesters"][latest_sem] if latest_sem else {}
        students_list.append({
            "student_name": data["student_name"],
            "latest_semester": latest_sem,
            "sgpa": sem_data.get("sgpa"),
            "cgpa": sem_data.get("cgpa"),
            "percentage": sem_data.get("percentage"),
            "category": sem_data.get("category")
        })
    return jsonify({"students": students_list})

@chatbot_bp.route("/report/<student_query>", methods=["GET"])
def get_student_report(student_query):
    students = fetch_student_data_from_university()

    # --- Disambiguation handling ---
    # lowered_map = {s.lower(): s for s in students.keys()}
    query_lower = student_query.lower()

# Find all students whose name starts with the given query (first word match)
    possible_matches = [
        name for name in students.keys()
        if name.lower().startswith(query_lower)
    ]

    if len(possible_matches) > 1:
        formatted_matches = [name.upper() for name in possible_matches]  # ✅ UPPERCASE
        return jsonify({
            "type": "disambiguation",
            "message": f"Multiple students found for '{student_query}'. Please specify the full name\nor choose from the dropdown",
            "options": formatted_matches
        })


    # Otherwise fall back to fuzzy match
    matched_name = _fuzzy_find_student(student_query, students.keys())
    if not matched_name:
        return jsonify({"error": "Student not found"}), 404

    student_data = students[matched_name]

    # ---------------- Backlogs ----------------
    backlogs = {}
    total_backlog_credits = 0
    for sem, data in student_data["semesters"].items():
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

    # ---------------- AI INSIGHTS (adaptive) ----------------
    latest_sem = get_latest_semester(student_data)
    ai_summary = ""
    ai_profile_data = {}
    trend_data = {}
    cgpa_prediction = {}

    if latest_sem:
        sem_data = student_data["semesters"][latest_sem]
        ia_marks = safe_marks(sem_data.get("ia_marks"))
        see_marks = safe_marks(sem_data.get("see_marks"))
        subjects = sem_data.get("subject_names", [])
        pass_fail = sem_data.get("pass_fail", [])

    total_marks = sum([ia + see for ia, see in zip(ia_marks, see_marks)]) 
    max_total_marks = sum([100]*len(subjects)) # assuming 100 marks per subject
    ai_summary = {
    "student_name": student_data["student_name"],
    "usn": sem_data.get("usn", "N/A"),
    "obtained_credits": sem_data.get("obtained_credits","N/A"),
    "semester": latest_sem,
    "total_marks": f"{total_marks}/{max_total_marks}",
    "sgpa": f"{sem_data.get('sgpa', 0):.2f}",
    "cgpa": f"{sem_data.get('cgpa', 0):.2f}",
    "percentage": f"{sem_data.get('percentage', 0):.2f}%",
    "backlog_status": (
        f"⚠️ Total backlog credits: {total_backlog_credits}. Backlogs need to be cleared."
        if total_backlog_credits > 0
        else "✅ No backlogs — academic record is clear."
    )
}


        # Tag aggregation (auto)
    tag_avgs, tag_counts, subject_tags = aggregate_tag_scores(student_data)
    strong_tags, mid_tags, weak_tags = classify_tag_strengths(tag_avgs)

        # Basic profile (subject-level strong/weak)
        # For usability keep subject-level strengths/weaknesses for latest sem as well
    latest_scores = np.array(ia_marks) + np.array(see_marks)
    latest_strong = [sub for sub, mark in zip(subjects, latest_scores) if mark >= 70]
    latest_mid = [sub for sub, mark in zip(subjects, latest_scores) if 40 <= mark < 70]        
    latest_weak = [sub for sub, mark in zip(subjects, latest_scores) if mark < 40]

        # Trend analysis & prediction
    history = get_student_history(student_data)
    if history:
        sems, sgpas = zip(*history)
        slope = np.polyfit(range(len(sgpas)), sgpas, 1)[0]
        trend_data = {
            "trend": "Improving" if slope > 0 else "Declining",
            "history": {sem: sgpa for sem, sgpa in history},
            "avg_sgpa": round(float(np.mean(sgpas)), 2)
        }
            # predictive model with confidence
        pred_info = predict_next_sgpa_with_confidence(history)
        if pred_info:
            # predicted_final_cgpa: average of existing sgpas + predicted next sgpa
            predicted_next = pred_info["predicted_next_sgpa"]
            predicted_final = round(float(np.mean(list(sgpas) + [predicted_next])), 2)
            cgpa_prediction = {
                "predicted_next_sgpa": predicted_next,
                "predicted_final_cgpa": predicted_final,
                "ci_low": pred_info["ci_low"],
                "ci_high": pred_info["ci_high"],
                "model": pred_info["model"],
                "resid_std": pred_info["resid_std"]
            }

        # Placement & learning advice (auto-generated from tags/trend/prediction/backlogs)
        placement_advice_list, learning_plan_list = build_placement_and_skill_advice(
            strong_tags, mid_tags, weak_tags, trend_data, cgpa_prediction, total_backlog_credits
        )

        ai_profile_data = {
            "latest_semester": latest_sem,
            "latest_strong_subjects": latest_strong,
            "latest_mid_subjects": latest_mid,
            "latest_weak_subjects": latest_weak,
            "tag_avgs": tag_avgs,
            "tag_counts": tag_counts,
            "subject_tags": subject_tags,
            "strong_tags": strong_tags,
            "mid_tags": mid_tags,
            "weak_tags": weak_tags,
            "placement_advice": placement_advice_list,
            "learning_plan": learning_plan_list
        }

    return jsonify({
        "student_name": student_data["student_name"],
        "semesters": student_data["semesters"],
        "backlogs": backlogs,
        "total_backlog_credits": total_backlog_credits,
        "ai_summary": ai_summary,
        "ai_profile": ai_profile_data,
        "trend": trend_data,
        "cgpa_prediction": cgpa_prediction
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


@chatbot_bp.route("/report/<student_query>/downloads", methods=["GET"])
def get_download_links(student_query):
    students = fetch_student_data_from_university()
    matched_name = _fuzzy_find_student(student_query, students.keys())
    
    if not matched_name:
        return jsonify({"error": "Student not found"}), 404

    student_name = students[matched_name]["student_name"]

    

    return jsonify({
        "type": "downloads",
        "downloadUrls": {
            "full": f"/api/report/{student_name}/pdf?type=full",
            "backlog": f"/api/report/{student_name}/pdf?type=backlog"
        }
    })

@chatbot_bp.route("/chatbot/intent", methods=["POST"])
def handle_intent():
    """
    Handles chatbot intents like 'download_pdf'.
    Expects JSON: { "intent": "<intent_name>", "query": "<student_name>" }
    """
    data = request.json
    intent = data.get("intent")
    query = data.get("query", "").strip()

    if intent == "download_pdf":
        # Extract student name if user typed: "download report <student_name>"
        student_name = query.replace("download report", "").strip()
        if not student_name:
            return jsonify({
                "message": "Please provide the student name to download the report."
            })

        # Fetch download links from backend route

    return jsonify({"message": "Intent not recognized."})

