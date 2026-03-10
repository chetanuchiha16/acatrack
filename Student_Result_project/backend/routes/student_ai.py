# ai_blueprint.py
import numpy as np
from deep_translator import GoogleTranslator
from extensions import cache
from flask import Blueprint, jsonify, request
from logger_config import get_logger
from models import Student
from models.helpers import get_batch_year

from .ai_algorithms import (
    _calculate_backlogs,
    aggregate_tag_scores,
    build_placement_and_skill_advice,
    classify_tag_strengths,
    get_latest_semester,
    get_student_history,
    predict_next_sgpa_with_confidence,
    safe_marks,
)

logger = get_logger(__name__)

ai_bp = Blueprint("ai", __name__)


def translate_text(text, target_lang):
    if not text or target_lang in ("en", None, ""):
        return text
    try:
        # map our frontend codes to google translate codes
        lang_map = {"hi": "hi", "kan": "kn"}
        target = lang_map.get(target_lang, "en")
        if target == "en":
            return text
        return GoogleTranslator(source="en", target=target).translate(text)
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return text


# ------------------ Helper: Multi-Semester History ------------------ #
def get_student_history_usn(usn, semesters):
    batch_year = get_batch_year()
    sgpas = []
    max_sem = int(max([s[-1] for s in semesters])) if semesters else 6
    students_dict = Student.get_all_semesters(
        usn=usn, batch_year=batch_year, max_sem=max_sem
    )

    for sem in semesters:
        try:
            if sem in students_dict:
                s = students_dict[sem]
                if getattr(s, "sgpa", None) is not None:
                    sgpas.append((sem, s.sgpa))
        except Exception:
            pass
    return sgpas


# ------------------ 1. AI Summary ------------------ #
@ai_bp.route("/ai/summary", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_summary():
    usn = request.args.get("usn")
    lng = request.args.get("lng", "en")
    batch_year = get_batch_year()
    if not usn:
        return jsonify({"error": "USN is required"}), 400

    semesters_list = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6"]
    student_data = {"student_name": "", "semesters": {}}

    students_dict = Student.get_all_semesters(usn=usn, batch_year=batch_year, max_sem=6)

    # Fetch all semesters
    for sem in semesters_list:
        try:
            if sem not in students_dict:
                continue
            s = students_dict[sem]
            if getattr(s, "sgpa", None) is None:
                continue
            student_data["student_name"] = s.name or ""

            def safe_list(val):
                if val is None:
                    return []
                if isinstance(val, int):
                    return [val]
                if isinstance(val, list):
                    return val
                return []

            student_data["semesters"][sem] = {
                "ia_marks": safe_list(s.ia_marks),
                "see_marks": safe_list(s.see_marks),
                "subject_names": safe_list(s.subject_names),
                "credits": safe_list(
                    getattr(s, "obtained_credits", 0) or getattr(s, "credits", 0)
                ),
                "pass_fail": safe_list(s.pass_fail),
                "sgpa": float(s.sgpa or 0.0),
                "cgpa": float(s.cgpa or 0.0),
                "percentage": float(s.percentage or 0.0),
            }
        except Exception as e:
            logger.debug(f"[AI_SUMMARY] Error for USN={usn}, SEM={sem}: {e}")
            continue

    if not student_data["semesters"]:
        return jsonify(
            {
                "error": "No data found for student",
                "usn": usn,
                "ai_summary": {},
                "ai_profile": {},
            }
        ), 404

    latest_sem = get_latest_semester(student_data)
    sem_data = student_data["semesters"][latest_sem]

    # Total marks
    ia_marks = sem_data.get("ia_marks") or []
    see_marks = sem_data.get("see_marks") or []
    length = max(len(ia_marks), len(see_marks))
    ia_marks += [0] * (length - len(ia_marks))
    see_marks += [0] * (length - len(see_marks))
    total_marks = sum([ia + see for ia, see in zip(ia_marks, see_marks)])
    max_total_marks = len(sem_data.get("subject_names") or []) * 100

    # Backlogs
    backlogs, total_backlog_credits = _calculate_backlogs(student_data)

    # Total credits
    credits = sem_data.get("credits", [])
    total_credits = (
        sum([c or 0 for c in credits]) if isinstance(credits, list) else (credits or 0)
    )

    # Summary Text
    backlog_status_text = (
        f"⚠️ Total backlog credits: {total_backlog_credits}. Backlogs need to be cleared."
        if total_backlog_credits > 0
        else "✅ No backlogs — academic record is clear."
    )
    translated_status = translate_text(backlog_status_text, lng)

    summary = {
        "name": student_data.get("student_name", ""),
        "usn": usn,
        "semester": latest_sem,
        "sgpa": round(sem_data.get("sgpa", 0.0), 2),
        "cgpa": round(sem_data.get("cgpa", 0.0), 2),
        "percentage": round(sem_data.get("percentage", 0.0), 2),
        "total_marks": f"{total_marks}/{max_total_marks}",
        "obtained_credits": total_credits,
        "backlog_status": translated_status,
    }

    return jsonify(
        {
            "ai_summary": summary,
            "ai_profile": {
                "backlogs": backlogs or {},
                "latest_strong_subjects": [],
                "latest_mid_subjects": [],
                "latest_weak_subjects": [],
                "strong_tags": [],
                "mid_tags": [],
                "weak_tags": [],
                "tag_avgs": {},
                "tag_counts": {},
                "subject_tags": {},
                "learning_plan": [],
                "placement_advice": [],
            },
        }
    )


# ------------------ 2. Trend Analysis ------------------ #
@ai_bp.route("/ai/trend", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_trend():
    usn = request.args.get("usn")
    batch_year = get_batch_year()
    semesters_list = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6"]
    student_data = {"semesters": {}}

    students_dict = Student.get_all_semesters(usn=usn, batch_year=batch_year, max_sem=6)

    for sem in semesters_list:
        try:
            if (
                sem in students_dict
                and getattr(students_dict[sem], "sgpa", None) is not None
            ):
                student_data["semesters"][sem] = {"sgpa": students_dict[sem].sgpa}
        except Exception:
            pass

    history = get_student_history(student_data)
    if not history:
        return jsonify({"error": "No SGPA history found"}), 404

    sems_done, sgpas = zip(*history)
    try:
        if len(sgpas) > 1:
            slope = np.polyfit(range(len(sgpas)), sgpas, 1)[0]
            trend = "Improving" if slope > 0 else "Declining"
        else:
            trend = "Insufficient data"
    except Exception as e:
        logger.debug(f"[DEBUG] Error calculating trend for USN={usn}: {e}")
        trend = "Error calculating trend"

    return jsonify(
        {
            "usn": usn,
            "history": {sem: sgpa for sem, sgpa in history},
            "trend": trend,
            "avg_sgpa": round(float(np.mean(sgpas)), 2),
        }
    )


# ------------------ 3. Predict Final CGPA ------------------ #
@ai_bp.route("/ai/predict_cgpa", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_predict_cgpa():
    usn = request.args.get("usn")
    sems = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7"]
    history = get_student_history_usn(usn, sems)

    if not history:
        return jsonify({"error": "No data found"}), 404

    if len(history) == 1:
        _, sgpas = zip(*history)
        predicted_next_sgpa = round(float(sgpas[0]), 2)
        predicted_final_cgpa = round(float(sgpas[0]), 2)
        cgpa_pred = {
            "predicted_next_sgpa": predicted_next_sgpa,
            "predicted_final_cgpa": predicted_final_cgpa,
            "ci_low": None,
            "ci_high": None,
            "model": "single_sem_fallback",
            "resid_std": None,
        }
    else:
        pred_info = predict_next_sgpa_with_confidence(history)
        if not pred_info:
            return jsonify({"error": "Prediction failed"}), 500
        _, sgpas = zip(*history)
        predicted_final_cgpa = round(
            float(np.mean(list(sgpas) + [pred_info["predicted_next_sgpa"]])), 2
        )
        cgpa_pred = {
            "predicted_next_sgpa": pred_info["predicted_next_sgpa"],
            "predicted_final_cgpa": predicted_final_cgpa,
            "ci_low": pred_info["ci_low"],
            "ci_high": pred_info["ci_high"],
            "model": pred_info["model"],
            "resid_std": pred_info["resid_std"],
        }

    return jsonify({"usn": usn, **cgpa_pred})


# ------------------ 4. Strength/Weakness Profile + Backlogs ------------------ #
@ai_bp.route("/ai/profile", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def ai_profile():
    usn = request.args.get("usn")
    lng = request.args.get("lng", "en")
    batch_year = get_batch_year()
    semesters_list = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6"]
    student_data = {"student_name": "", "semesters": {}}

    students_dict = Student.get_all_semesters(usn=usn, batch_year=batch_year, max_sem=6)

    for sem in semesters_list:
        try:
            if sem not in students_dict:
                continue
            s = students_dict[sem]
            if getattr(s, "sgpa", None) is None:
                continue
            student_data["student_name"] = s.name
            student_data["semesters"][sem] = {
                "ia_marks": s.ia_marks or [],
                "see_marks": s.see_marks or [],
                "subject_names": s.subject_names or [],
                "credits": s.credits or [],
                "pass_fail": s.pass_fail or [],
                "sgpa": s.sgpa,
                "cgpa": s.cgpa,
                "percentage": s.percentage,
            }
        except Exception:
            pass

    if not student_data["semesters"]:
        return jsonify({"error": "No data found for student"}), 404

    backlogs, total_backlog_credits = _calculate_backlogs(student_data)

    # Trend & Prediction
    history = get_student_history(student_data)
    trend_data = {}
    cgpa_pred = {}
    if history:
        sems, sgpas = zip(*history)
        if len(sgpas) > 1:
            slope = np.polyfit(range(len(sgpas)), sgpas, 1)[0]
            trend_data = {
                "trend": "Improving" if slope > 0 else "Declining",
                "history": {sem: sgpa for sem, sgpa in history},
                "avg_sgpa": round(float(np.mean(sgpas)), 2),
            }
            pred_info = predict_next_sgpa_with_confidence(history)
            if pred_info:
                predicted_next = pred_info["predicted_next_sgpa"]
                predicted_final = round(
                    float(np.mean(list(sgpas) + [predicted_next])), 2
                )
                cgpa_pred = {
                    "predicted_next_sgpa": predicted_next,
                    "predicted_final_cgpa": predicted_final,
                    "ci_low": pred_info["ci_low"],
                    "ci_high": pred_info["ci_high"],
                    "model": pred_info["model"],
                    "resid_std": pred_info["resid_std"],
                }
        else:
            trend_data = {
                "trend": "Insufficient data",
                "history": {sems[0]: sgpas[0]},
                "avg_sgpa": round(float(sgpas[0]), 2),
            }
            cgpa_pred = {
                "predicted_next_sgpa": round(float(sgpas[0]), 2),
                "predicted_final_cgpa": round(float(sgpas[0]), 2),
                "ci_low": None,
                "ci_high": None,
                "model": "single_sem_fallback",
                "resid_std": None,
            }

    tag_avgs, tag_counts, subject_tags = aggregate_tag_scores(student_data)
    strong_tags, mid_tags, weak_tags = classify_tag_strengths(tag_avgs)

    latest_sem = get_latest_semester(student_data)
    latest_scores = np.array(
        safe_marks(student_data["semesters"][latest_sem]["ia_marks"])
    ) + np.array(safe_marks(student_data["semesters"][latest_sem]["see_marks"]))
    subjects = student_data["semesters"][latest_sem]["subject_names"]
    latest_strong = [sub for sub, mark in zip(subjects, latest_scores) if mark >= 70]
    latest_mid = [sub for sub, mark in zip(subjects, latest_scores) if 40 <= mark < 70]
    latest_weak = [sub for sub, mark in zip(subjects, latest_scores) if mark < 40]

    placement_advice, learning_plan = build_placement_and_skill_advice(
        strong_tags, mid_tags, weak_tags, trend_data, cgpa_pred, total_backlog_credits
    )

    t_placement_advice = [translate_text(adv, lng) for adv in placement_advice]
    t_learning_plan = [translate_text(lp, lng) for lp in learning_plan]

    return jsonify(
        {
            "name": student_data["student_name"],
            "usn": usn,
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
            "backlogs": backlogs,
            "total_backlog_credits": total_backlog_credits,
            "trend": trend_data,
            "cgpa_prediction": cgpa_pred,
            "placement_advice": t_placement_advice,
            "learning_plan": t_learning_plan,
        }
    )
