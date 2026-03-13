import matplotlib

# from .student_services import get_student_result
import numpy as np
from flask import Blueprint, jsonify, request

matplotlib.use("Agg")
import base64
import io

import matplotlib.pyplot as plt
from services.student_service import Student
from utils.helpers import get_batch_year
from sklearn.linear_model import LinearRegression
from visuals import create_student_report

student_api_bp = Blueprint("student_api", __name__)
# student_service.py


def get_student_result(usn: str, semester: str, batch_year: int):
    # Create DB engine and Student object
    student = Student(usn=usn, semester=semester, batch_year=batch_year)

    # Generate PDF entirely in memory
    pdf_bytes = create_student_report(student)  # returns bytes
    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    # Build result dictionary
    result = {
        "name": student.name,
        "usn": student.usn,
        "total_marks": student.total_marks,
        "percentage": student.percentage,
        "credits": student.obtained_credits,
        "sgpa": student.sgpa,
        "cgpa": student.cgpa,
        "subjects": [
            {
                "subject_name": subject_name,
                "code": code,
                "ia": ia,
                "see": see,
                "total": ia + see,
                "credit": credit,
                "status": status,
            }
            for code, subject_name, ia, see, credit, status in zip(
                student.subject_codes,
                student.subject_names,
                student.ia_marks,
                student.see_marks,
                student.credits,
                student.pass_fail,
            )
        ],
        "pdf_url": f"data:application/pdf;base64,{pdf_base64}",  # inline PDF
    }
    return result


def predict_future_sgpa(previous_sgpas, num_semesters_completed, total_semesters=8):
    """
    Simple linear regression prediction for future CGPA/SGPA.
    """
    X = np.arange(1, num_semesters_completed + 1).reshape(-1, 1)
    y = np.array(previous_sgpas[:num_semesters_completed])
    if len(y) < 2:  # not enough data to predict
        return float(y[-1]) if len(y) > 0 else 0
    model = LinearRegression()
    model.fit(X, y)
    next_sem = np.array([[num_semesters_completed + 1]])
    return float(model.predict(next_sem)[0])


def analyze_student_performance(usn, semester, batch_year):
    student = get_student_result(usn, semester, batch_year=batch_year) or {}
    subjects = student.get("subjects") or []

    analysis = {
        "summary": "",
        "weak_subjects": [],
        "average_subjects": [],
        "good_subjects": [],
        "strong_subjects": [],
        "improvement_advice": [],
        "study_summary": "",
        "subject_analysis": [],
    }

    critical_marks = []
    urgent_marks = []
    below_avg_marks = []
    avg_marks = []
    good_marks_list = []
    very_good_marks = []
    excellent_marks = []
    outstanding_marks = []

    for sub in subjects:
        marks = sub.get("total") or 0
        credit = sub.get("credit") or 0
        name = sub.get("subject_name") or "Unknown"

        advice_list = []

        # More granular performance categorization
        # More granular performance categorization
        if marks < 30:
            analysis["weak_subjects"].append(name)
            advice_list.append(
                f"Critical attention needed in {name} (score {marks}). Revisit fundamentals."
            )
            critical_marks.append(name)
        elif 30 <= marks < 40:
            analysis["weak_subjects"].append(name)
            advice_list.append(
                f"Urgent improvement required in {name} (score {marks}). Focus on practice."
            )
            urgent_marks.append(name)
        elif 40 <= marks < 50:
            analysis["average_subjects"].append(name)
            advice_list.append(
                f"Below average in {name} (score {marks}). Consistent effort needed."
            )
            below_avg_marks.append(name)
        elif 50 <= marks < 60:
            analysis["average_subjects"].append(name)
            advice_list.append(
                f"Passable in {name} (score {marks}). Push beyond basics."
            )
            avg_marks.append(name)
        elif 60 <= marks < 70:
            analysis["good_subjects"].append(name)
            advice_list.append(
                f"Good performance in {name} (score {marks}). Refine concepts further."
            )
            good_marks_list.append(name)
        elif 70 <= marks < 80:
            analysis["strong_subjects"].append(name)
            advice_list.append(
                f"Very good in {name} (score {marks}). Aim for excellence."
            )
            very_good_marks.append(name)
        elif 80 <= marks < 90:
            analysis["strong_subjects"].append(name)
            advice_list.append(
                f"Excellent in {name} (score {marks}). Maintain consistency."
            )
            excellent_marks.append(name)
        else:  # 90+
            analysis["strong_subjects"].append(name)
            advice_list.append(
                f"Outstanding in {name} (score {marks}). Consider advanced challenges."
            )
            outstanding_marks.append(name)

        if credit >= 3 and marks < 60:
            advice_list.append("High credit weight: allocate extra study hours.")

        analysis["improvement_advice"].extend(advice_list)

        # Subject-wise analysis for frontend table
        sub_analysis = {
            "code": sub.get("code") or "N/A",
            "subject_name": name,
            "ia": sub.get("ia") or 0,
            "see": sub.get("see") or 0,
            "total": marks,
            "status": sub.get("status") or "N/A",
            "advice": " | ".join(advice_list),
        }
        analysis["subject_analysis"].append(sub_analysis)

    # Summary based on SGPA
    sgpa = student.get("sgpa") or 0
    if sgpa < 5:
        analysis["summary"] = (
            "Performance is critically low. Immediate academic support needed."
        )
    elif 5 <= sgpa < 6:
        analysis["summary"] = "Needs significant improvement. Focus on fundamentals."
    elif 6 <= sgpa < 7:
        analysis["summary"] = "Moderate performance. With extra effort, can improve."
    elif 7 <= sgpa < 8:
        analysis["summary"] = "Good progress. Strengthen weaker areas for higher SGPA."
    elif 8 <= sgpa < 9:
        analysis["summary"] = (
            "Very good performance. Maintain consistency and aim higher."
        )
    else:  # 9+
        analysis["summary"] = (
            "Excellent performance! Keep up and explore advanced learning opportunities."
        )

    # Generate concise 2-3 sentence study summary
    summary_parts = []
    if critical_marks:
        summary_parts.append(
            f"Critical attention needed in {', '.join(critical_marks)}. Revisit basics thoroughly."
        )
    if urgent_marks:
        summary_parts.append(
            f"Urgent improvement required in {', '.join(urgent_marks)}. Focus on practice and revisions."
        )
    if below_avg_marks:
        summary_parts.append(
            f"Work steadily on {', '.join(below_avg_marks)} to lift performance above average."
        )
    if avg_marks:
        summary_parts.append(
            f"Push beyond the basics in {', '.join(avg_marks)} to achieve better results."
        )
    if good_marks_list:
        summary_parts.append(
            f"Good grasp in {', '.join(good_marks_list)}. Refine concepts to aim higher."
        )
    if very_good_marks:
        summary_parts.append(
            f"Very good performance in {', '.join(very_good_marks)}. Aim for excellence."
        )
    if excellent_marks:
        summary_parts.append(
            f"Excellent in {', '.join(excellent_marks)}. Maintain consistency."
        )
    if outstanding_marks:
        summary_parts.append(
            f"Outstanding work in {', '.join(outstanding_marks)}. Consider advanced challenges."
        )

    # Keep concise: only top 3 sentences
    analysis["study_summary"] = (
        " ".join(summary_parts[:3])
        if summary_parts
        else "Focus on overall improvement."
    )

    # Predict future SGPA
    previous_sgpas = [
        student.get("sgpa") or 0
    ]  # Extend with historical SGPA if available
    analysis["predicted_next_sgpa"] = predict_future_sgpa(
        previous_sgpas, num_semesters_completed=len(previous_sgpas)
    )

    # Ensure frontend always gets arrays
    for key in [
        "subject_analysis",
        "weak_subjects",
        "average_subjects",
        "good_subjects",
        "strong_subjects",
        "improvement_advice",
    ]:
        if not isinstance(analysis.get(key), list):
            analysis[key] = []

    return {**student, **analysis}


def generate_subject_marks_plot(subjects):
    """
    Generate a plot of marks vs subjects using subject codes instead of full names.
    Returns a BytesIO buffer containing the PNG image.
    """
    if not subjects:
        return None

    subject_codes = [sub.get("code") or "N/A" for sub in subjects]
    marks = [sub.get("total") or 0 for sub in subjects]

    fig, ax = plt.subplots(figsize=(10, 6), dpi=80)
    ax.bar(subject_codes, marks, color="skyblue", edgecolor="black")

    ax.set_title("Marks vs Subjects", fontsize=14, weight="bold")
    ax.set_xlabel("Subjects (Code)", fontsize=12)
    ax.set_ylabel("Marks", fontsize=12)

    ax.set_xticks(range(len(subject_codes)))
    ax.set_xticklabels(subject_codes, rotation=45, ha="right")

    for i, val in enumerate(marks):
        ax.text(i, val + 1, str(val), ha="center", fontsize=9)

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    plt.close(fig)

    return buf


@student_api_bp.route("/auth/Student/analysis", methods=["GET"])
def get_student_analysis():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    batch_year = get_batch_year()

    if not usn or not semester:
        return jsonify({"error": "USN and semester are required"}), 400

    try:
        analysis = analyze_student_performance(usn, semester, batch_year=batch_year)

        # Optionally remove 'study_tips' to avoid confusion
        analysis.pop("study_tips", None)

        # Ensure frontend has 'study_summary'
        if "study_summary" not in analysis:
            analysis["study_summary"] = "Focus on overall improvement."

        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
