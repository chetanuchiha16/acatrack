from flask import Blueprint, request, jsonify
from models import Student, University
from models.paths import db_path
import numpy as np
from sklearn.linear_model import LinearRegression
from transformers import pipeline

ai_bp = Blueprint("ai", __name__)

# ------------------ Light AI Components ------------------ #
try:
    summarizer = pipeline(
        "summarization", model="facebook/bart-large-cnn", device=-1
    )  # CPU
except Exception:
    summarizer = None  # fallback if transformers too heavy


# ------------------ Helper: Collect Multi-Semester Data ------------------ #
def get_student_history(usn, semesters):
    sgpas = []
    for sem in semesters:
        try:
            s = Student(usn=usn, semester=sem, db_path=db_path)
            s.calculate_sgpa()
            if s.sgpa:
                sgpas.append((sem, s.sgpa))
        except Exception:
            pass
    return sgpas


# ------------------ 1. Smart Summary ------------------ #
@ai_bp.route("/ai/summary", methods=["GET"])
def ai_summary():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    student = Student(usn=usn, semester=semester, db_path=db_path)

    subjects = [
        f"{sub}: {ia+see} marks (IA {ia}, SEE {see}), {status}"
        for sub, ia, see, status in zip(
            student.subject_names, student.ia_marks, student.see_marks, student.pass_fail
        )
    ]
    performance_text = ". ".join(subjects)

    if summarizer:
        ai_text = summarizer(
            performance_text, max_length=90, min_length=40, do_sample=False
        )[0]["summary_text"]
    else:
        ai_text = f"{student.name} completed {semester} with {student.sgpa:.2f} SGPA."

    return jsonify({
        "name": student.name,
        "usn": student.usn,
        "semester": semester,
        "ai_summary": ai_text,
    })


# ------------------ 2. Trend Analysis ------------------ #
@ai_bp.route("/ai/trend", methods=["GET"])
def ai_trend():
    usn = request.args.get("usn")
    sems = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6", "SEM7", "SEM8"]
    history = get_student_history(usn, sems)

    if not history:
        return jsonify({"error": "No SGPA history found"}), 404

    sems_done, sgpas = zip(*history)
    trend = "improving" if np.polyfit(range(len(sgpas)), sgpas, 1)[0] > 0 else "declining"

    return jsonify({
        "usn": usn,
        "history": {sem: sgpa for sem, sgpa in history},
        "trend": trend,
        "avg_sgpa": round(np.mean(sgpas), 2),
    })


# ------------------ 3. Final CGPA Prediction ------------------ #
@ai_bp.route("/ai/predict_cgpa", methods=["GET"])
def ai_predict_cgpa():
    usn = request.args.get("usn")
    sems = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6", "SEM7"]
    history = get_student_history(usn, sems)

    if len(history) < 2:
        return jsonify({"error": "Not enough data to predict"}), 400

    _, sgpas = zip(*history)
    X = np.array(range(1, len(sgpas) + 1)).reshape(-1, 1)
    y = np.array(sgpas)

    model = LinearRegression().fit(X, y)
    future_sgpa = model.predict([[len(sgpas) + 1]])[0]

    predicted_final_cgpa = np.mean(list(sgpas) + [future_sgpa])

    return jsonify({
        "usn": usn,
        "predicted_next_sgpa": round(float(future_sgpa), 2),
        "predicted_final_cgpa": round(float(predicted_final_cgpa), 2),
    })


# ------------------ 4. Strength/Weakness Profile ------------------ #
@ai_bp.route("/ai/profile", methods=["GET"])
def ai_profile():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    student = Student(usn=usn, semester=semester, db_path=db_path)

    scores = np.array(student.ia_marks) + np.array(student.see_marks)

    strong = [sub for sub, mark in zip(student.subject_names, scores) if mark >= 70]
    weak = [sub for sub, mark in zip(student.subject_names, scores) if mark < 40]

    advice = []
    if weak:
        advice.append("Focus more on analytical/problem-solving areas." if any("Math" in s for s in weak) else "")
        advice.append("Programming practice is needed." if any("Programming" in s for s in weak) else "")
    if strong:
        advice.append("Keep strengthening coding/logic skills." if any("Programming" in s for s in strong) else "")

    return jsonify({
        "name": student.name,
        "usn": student.usn,
        "semester": semester,
        "strengths": strong,
        "weaknesses": weak,
        "ai_advice": [a for a in advice if a]
    })
