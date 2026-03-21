# student_report_blueprint.py
import re
from collections import defaultdict
from io import BytesIO

import numpy as np
from logger_config import get_logger
from rapidfuzz import fuzz
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sklearn.linear_model import Ridge

logger = get_logger(__name__)


# ---------------- UNIVERSITY INIT ----------------


# ---------------- PDF GENERATION ----------------
def generate_pdf_report(student_data, semester=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>Student Academic Report</b>", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            f"<b>Student Name:</b> {student_data['student_name']}", styles["Heading2"]
        )
    )
    story.append(Spacer(1, 12))

    semesters_to_include = (
        {semester: student_data["semesters"][semester]}
        if semester
        else student_data["semesters"]
    )

    for sem, data in semesters_to_include.items():
        story.append(Paragraph(f"<b>{sem}</b>", styles["Heading2"]))
        story.append(
            Paragraph(
                f"SGPA: {data['sgpa']}, CGPA: {data['cgpa']:.2f}, Percentage: {data['percentage']:.2f}%, Credits Obtained: {data['obtained_credits']}",
                styles["Normal"],
            )
        )
        table_data = [["Subject", "Internal", "External", "Total", "Credits", "Result"]]
        for s_name, s_code, ia, see, credit, status in zip(
            data["subject_names"],
            data["subject_codes"],
            data["ia_marks"],
            data["see_marks"],
            data["credits"],
            data["pass_fail"],
        ):
            total = ia + see
            table_data.append([f"{s_name} ({s_code})", ia, see, total, credit, status])
        table = Table(table_data, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ADD8E6")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 12))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_backlog_pdf(student_name, backlogs, total_credits):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Filter out semesters with 0 backlog credits
    backlogs = {
        sem: sem_data
        for sem, sem_data in (backlogs or {}).items()
        if sem_data.get("semester_backlog_credits", 0) > 0
    }

    # Title
    story.append(Paragraph(f"<b>Backlog Report - {student_name}</b>", styles["Title"]))
    story.append(Spacer(1, 12))

    # No backlogs case
    if not backlogs or total_credits == 0:
        story.append(
            Paragraph(
                "<font color='green'><b>✅ No backlogs found.</b></font>",
                styles["Normal"],
            )
        )
    else:
        # Has backlogs
        story.append(
            Paragraph(
                "<font color='red'><b>⚠️ Student has backlogs!</b></font>",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 12))

        if total_credits > 18:
            story.append(
                Paragraph(
                    "<font color='red'><b>⚠️ Backlog credits exceed 18. Risk of year back.</b></font>",
                    styles["Normal"],
                )
            )
            story.append(Spacer(1, 12))

        # Iterate over each semester with actual backlogs
        for sem, sem_data in backlogs.items():
            failed_subjects = sem_data.get("failed_subjects", [])

            story.append(Paragraph(f"<b>{sem}</b>", styles["Heading2"]))

            # Table of failed subjects
            table_data = [["Subject", "Internal", "External", "Credits"]]
            for s in failed_subjects:
                table_data.append(
                    [
                        s.get("subject", "N/A"),
                        s.get("internal", 0),
                        s.get("external", 0),
                        s.get("credits", 0),
                    ]
                )

            table = Table(table_data, hAlign="LEFT")
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.red),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ]
                )
            )
            story.append(table)
            story.append(Spacer(1, 12))

        # Total backlog credits at the end
        story.append(
            Paragraph(
                f"<b>Total Backlog Credits:</b> {total_credits}", styles["Normal"]
            )
        )

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


# ---------------- HELPERS ----------------


def _calculate_backlogs(student_data):
    backlogs = {}
    total_credits = 0.0

    for sem, data in student_data.get("semesters", {}).items():
        sem_backlogs = []
        sem_credit_sum = 0.0

        for ia, see, credit, subject, status in zip(
            data.get("ia_marks", []),
            data.get("see_marks", []),
            data.get("credits", []),
            data.get("subject_names", []),
            data.get("pass_fail", []),
        ):
            if status == "Fail":
                # Ensure credit is treated safely; sometimes it might accidentally hold a large number if arrays are dirty
                safe_credit = (
                    float(credit)
                    if credit is not None and str(credit).replace(".", "", 1).isdigit()
                    else 0.0
                )

                # If credit is absurdly high (like a total score), default to standard 3
                if safe_credit > 10:
                    safe_credit = 3.0

                sem_backlogs.append(
                    {
                        "subject": subject,
                        "internal": ia,
                        "external": see,
                        "credits": safe_credit,
                    }
                )
                sem_credit_sum += safe_credit
                total_credits += safe_credit

        if sem_backlogs:
            backlogs[sem] = {
                "failed_subjects": sem_backlogs,
                "semester_backlog_credits": sem_credit_sum,
            }

    return backlogs, total_credits


def get_latest_semester(student_data):
    # Case 1: Nested "semesters" dict (old format with multiple semesters)
    semesters = student_data.get("semesters")
    if semesters:
        valid_sems = [
            sem for sem, data in semesters.items() if data.get("sgpa") is not None
        ]
        if valid_sems:
            # Sort by numeric part of "SEMx"
            valid_sems.sort(key=lambda x: int(x.replace("sem", "")))
            return valid_sems[-1]

    # Case 2: Flat JSON (new format with only one semester)
    if "sgpa" in student_data and student_data["sgpa"] is not None:
        pdf_url = student_data.get("pdf_url", "")
        match = re.search(r"(sem\d+)", pdf_url)
        if match:
            return match.group(1)  # e.g. "sem5"

    return None


def safe_marks(marks):
    return [m if m is not None else 0 for m in marks or []]


def get_student_history(student_data):
    semesters = student_data.get("semesters", {})

    # Extract number from keys like "sem1", "sem2"
    def sem_key(sem):
        match = re.search(r"\d+", sem)
        return int(match.group()) if match else 0

    return [
        (sem, data["sgpa"])
        for sem, data in sorted(semesters.items(), key=lambda x: sem_key(x[0]))
        if data.get("sgpa") is not None
    ]


# ---------------- Adaptive AI helpers ----------------
# A small, extendable keyword map for detecting subject tags
SUBJECT_TAG_KEYWORDS = {
    "programming": [
        "programming",
        "data structures",
        "algorithms",
        "dsa",
        "software",
        "coding",
        "java",
        "python",
        "c++",
        "c",
    ],
    "math": [
        "math",
        "mathematics",
        "discrete",
        "calculus",
        "statistics",
        "probability",
        "linear algebra",
    ],
    "data": [
        "data",
        "database",
        "dbms",
        "data mining",
        "data science",
        "machine learning",
        "ai",
        "artificial intelligence",
    ],
    "electronics": [
        "electronics",
        "circuit",
        "microcontroller",
        "analog",
        "digital",
        "signal",
        "embedded",
    ],
    "networking": ["network", "communication", "tcp", "udp", "routing", "networking"],
    "management": [
        "management",
        "economics",
        "accounts",
        "business",
        "marketing",
        "management studies",
    ],
    "communication": ["english", "communication", "soft skills", "interpersonal"],
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
        "resid_std": round(resid_std, 3),
    }


def build_placement_and_skill_advice(
    strong_tags, mid_tags, weak_tags, trend_data, cgpa_pred, total_backlog_credits
):
    """
    Generate human-friendly advice strings using tag strengths, trend, predicted CGPA and backlog info.
    """
    advice = []
    learning_plan = []

    # Placement suggestions by tag
    if "programming" in strong_tags:
        advice.append(
            "Strong in programming → Good fit for software/coding internships. Focus on DSA, system design basics, and personal projects."
        )
        learning_plan.append(
            "Practice on coding platforms (DSA), contribute to small projects, build 2-3 demonstrable projects."
        )
    elif "programming" in mid_tags:
        advice.append(
            "Programming is moderate → strengthen algorithms & projects to target coding roles."
        )
        learning_plan.append(
            "Daily DSA practice (1–2 problems), small project focusing on implementation and debugging."
        )
    elif "programming" in weak_tags:
        advice.append(
            "Programming is weak → start with fundamentals (syntax, basic algorithms) and small exercises."
        )
        learning_plan.append(
            "Beginner tutorials + practice problems, pair-programming, small guided projects."
        )

    if "data" in strong_tags:
        advice.append(
            "Good data-oriented skills → consider analytics/data science roles; learn SQL, pandas, and basic ML pipelines."
        )
        learning_plan.append(
            "Work on data cleaning, SQL queries, mini-ML projects and Kaggle beginner challenges."
        )
    if "math" in strong_tags:
        advice.append(
            "Strong mathematical foundation → suitable for analytics, research or systems roles requiring quantitative reasoning."
        )
        learning_plan.append(
            "Practice probability/statistics & linear algebra applied to ML/algorithms."
        )

    if total_backlog_credits > 0:
        advice.append(
            "Clear backlogs soon — many recruiters shortlist based on clear academic records."
        )
        learning_plan.append(
            "Prioritise backlog clearance and short-term revision plans for failed subjects."
        )

    # Trend-based advice
    if trend_data:
        if trend_data.get("trend") == "Declining":
            advice.append(
                "SGPA trend is Declining — identify root causes (attendance, exam prep, fundamentals)."
            )
            learning_plan.append(
                "Strengthen fundamentals for weak topics, structured weekly study plan, and seek mentoring or extra classes."
            )
        else:
            advice.append(
                "SGPA trend is Improving — maintain study routine and strengthen project-based learning."
            )

    # CGPA-based realistic positioning
    if cgpa_pred:
        final_cgpa = cgpa_pred.get("predicted_final_cgpa") or cgpa_pred.get(
            "predicted_final_cgpa", None
        )
        # if predicted_final_cgpa is present
        if isinstance(final_cgpa, (int, float)):
            if final_cgpa >= 7.5:
                advice.append(
                    "Predicted CGPA is competitive for campus placements at mid-large companies; focus on interview prep & projects."
                )
            elif final_cgpa >= 6.0:
                advice.append(
                    "Predicted CGPA is decent — target internships, niche roles and strengthen practical skills & projects."
                )
            else:
                advice.append(
                    "Predicted CGPA is low — aim for internships, upskilling courses, and consider certification-based skill proof."
                )

    # generic suggestions for weak tags
    for t in weak_tags:
        if t == "communication":
            learning_plan.append(
                "Work on communication: mock interviews, presentation practice, and resume polish."
            )
        else:
            learning_plan.append(
                f"Review fundamentals for {t}, use guided courses and hands-on mini-projects."
            )

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
