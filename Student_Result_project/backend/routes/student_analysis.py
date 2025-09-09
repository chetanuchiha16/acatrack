from flask import Blueprint, request, jsonify
from .student_services import get_student_result
import numpy as np
from sklearn.linear_model import LinearRegression

student_api_bp = Blueprint('student_api', __name__)

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

def analyze_student_performance(usn, semester):
    student = get_student_result(usn, semester) or {}
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

    low_marks = []
    mid_marks = []
    good_marks = []
    high_marks = []

    for sub in subjects:
        marks = sub.get("total") or 0
        credit = sub.get("credit") or 0
        name = sub.get("subject_name") or "Unknown"

        advice_list = []

        # More granular performance categorization
        if marks < 40:
            analysis["weak_subjects"].append(name)
            advice_list.append(f"Focus intensively on {name} (score {marks}).")
            low_marks.append(name)
        elif 40 <= marks < 55:
            analysis["average_subjects"].append(name)
            advice_list.append(f"Improve understanding in {name} (score {marks}).")
            mid_marks.append(name)
        elif 55 <= marks < 70:
            analysis["good_subjects"].append(name)
            advice_list.append(f"Solid performance in {name} (score {marks}), but room to improve.")
            good_marks.append(name)
        else:  # 70+
            analysis["strong_subjects"].append(name)
            advice_list.append(f"Maintain your excellent performance in {name} (score {marks}).")
            high_marks.append(name)

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
    if sgpa >= 8:
        analysis["summary"] = "Excellent performance! Maintain your grades and aim higher."
    elif 6.5 <= sgpa < 8:
        analysis["summary"] = "Good performance. Focus on weak and average subjects."
    else:
        analysis["summary"] = "Performance needs improvement. Focus on critical subjects."

    # Generate concise 2-3 sentence study summary
    summary_parts = []
    if low_marks:
        summary_parts.append(f"Focus intensively on {', '.join(low_marks)} to strengthen your fundamentals.")
    if mid_marks:
        summary_parts.append(f"Improve understanding in {', '.join(mid_marks)} through practice and revision.")
    if good_marks:
        summary_parts.append(f"Keep refining {', '.join(good_marks)} to achieve higher mastery.")
    if high_marks:
        summary_parts.append(f"Maintain performance in {', '.join(high_marks)} and challenge yourself further.")

    # Take only top 2-3 parts for a concise summary
    analysis["study_summary"] = " ".join(summary_parts[:3]) if summary_parts else "Focus on overall improvement."

    # Predict future SGPA
    previous_sgpas = [student.get("sgpa") or 0]  # Extend with historical SGPA if available
    analysis["predicted_next_sgpa"] = predict_future_sgpa(previous_sgpas, num_semesters_completed=len(previous_sgpas))

    # Ensure frontend always gets arrays
    for key in ["subject_analysis", "weak_subjects", "average_subjects", "good_subjects", "strong_subjects", "improvement_advice"]:
        if not isinstance(analysis.get(key), list):
            analysis[key] = []

    return {**student, **analysis}



@student_api_bp.route("/auth/Student/analysis", methods=["GET"])
def get_student_analysis():
    usn = request.args.get("usn")
    semester = request.args.get("semester")

    if not usn or not semester:
        return jsonify({"error": "USN and semester are required"}), 400

    try:
        analysis = analyze_student_performance(usn, semester)

        # Optionally remove 'study_tips' to avoid confusion
        analysis.pop("study_tips", None)

        # Ensure frontend has 'study_summary'
        if "study_summary" not in analysis:
            analysis["study_summary"] = "Focus on overall improvement."

        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
