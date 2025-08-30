from flask import Blueprint, request, jsonify
from models import Student, University
from models.paths import db_path
from transformers import pipeline
from sklearn.linear_model import LinearRegression, LogisticRegression
import numpy as np
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
# tf-keras

ai_bp = Blueprint('ai', __name__)

# ------------------ AI Components ------------------ #
summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=-1)

# ------------------ Training Helpers ------------------ #
def train_sgpa_model(semesters):
    X, y = [], []

    for sem in semesters:
        uni = University(db_path=db_path)
        uni.add_students(sem)

        for student in uni.students:
            student.calculate_sgpa()
            if student.sgpa:  # only valid SGPA
                X.append([student.total_marks, student.obtained_credits])
                y.append(student.sgpa)

    if X and y:
        return LinearRegression().fit(np.array(X), np.array(y))
    return None


def train_risk_model(semesters):
    X, y = [], []

    for sem in semesters:
        uni = University(db_path=db_path)
        uni.add_students(sem)

        for student in uni.students:
            pass_fail = student.calculate_pass_fail()
            for ia, see, status in zip(student.ia_marks, student.see_marks, pass_fail):
                total = ia + see
                X.append([total])
                y.append(1 if status == "Fail" else 0)

    if X and y:
        return LogisticRegression().fit(np.array(X), np.array(y))
    return None


# ------------------ Train Once (SEM1–SEM4) ------------------ #
TRAIN_SEMS = ["SEM1", "SEM2", "SEM3", "SEM4"]

sgpa_model = train_sgpa_model(TRAIN_SEMS)
risk_model = train_risk_model(TRAIN_SEMS)


# ------------------ 1. Smart Summary ------------------ #
@ai_bp.route("/auth/Student/ai_summary", methods=["GET"])
def ai_summary():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    student = Student(usn=usn, semester=semester, db_path=db_path)

    subjects = [
        f"{sub} ({code}): {ia+see} marks, Status: {status}"
        for sub, code, ia, see, status in zip(
            student.subject_names, student.subject_codes,
            student.ia_marks, student.see_marks, student.pass_fail
        )
    ]
    performance_text = ". ".join(subjects)

    ai_text = summarizer(
        performance_text, max_length=100, min_length=40, do_sample=False
    )[0]['summary_text']

    strong = [
        sub for sub, mark in zip(
            student.subject_names, np.array(student.ia_marks) + np.array(student.see_marks)
        ) if mark >= 70
    ]
    weak = [
        sub for sub, mark in zip(
            student.subject_names, np.array(student.ia_marks) + np.array(student.see_marks)
        ) if mark < 40
    ]

    insights = {
        "strengths": strong,
        "weaknesses": weak,
        "credits_remaining": max(0, 200 - student.obtained_credits)
    }

    return jsonify({
        "name": student.name,
        "usn": student.usn,
        "semester": semester,
        "ai_summary": ai_text,
        "insights": insights
    })


# ------------------ 2. SGPA/CGPA Prediction ------------------ #
@ai_bp.route("/auth/Student/predict_sgpa", methods=["GET"])
def predict_sgpa():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    student = Student(usn=usn, semester=semester, db_path=db_path)

    if not sgpa_model:
        return jsonify({"error": "SGPA model not trained"}), 500

    features = np.array([[student.total_marks, student.obtained_credits]])
    predicted_sgpa = sgpa_model.predict(features)[0]

    return jsonify({
        "name": student.name,
        "usn": student.usn,
        "semester": semester,
        "predicted_sgpa": round(float(predicted_sgpa), 2),
        "predicted_final_cgpa": round((student.cgpa + predicted_sgpa)/2, 2)
    })


# ------------------ 3. Risk Analysis ------------------ #
@ai_bp.route("/auth/Student/risk_analysis", methods=["GET"])
def risk_analysis():
    usn = request.args.get("usn")
    semester = request.args.get("semester")
    student = Student(usn=usn, semester=semester, db_path=db_path)

    if not risk_model:
        return jsonify({"error": "Risk model not trained"}), 500

    risks = {}
    for sub, mark in zip(student.subject_names, np.array(student.ia_marks)+np.array(student.see_marks)):
        prob_fail = risk_model.predict_proba([[mark]])[0][1]
        risks[sub] = round(float(prob_fail), 2)

    return jsonify({
        "name": student.name,
        "usn": student.usn,
        "semester": semester,
        "risk_analysis": risks
    })
