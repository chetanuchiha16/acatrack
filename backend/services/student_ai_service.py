import re
from collections import defaultdict
import numpy as np
from deep_translator import GoogleTranslator
from logger_config import get_logger
from services.student_service import Student
from sklearn.linear_model import Ridge
from rapidfuzz import fuzz

logger = get_logger(__name__)


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


def get_student_history_usn(usn, semesters, batch_year: int):
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


def get_ai_summary_data(usn: str, lng: str, batch_year: int) -> tuple[dict, int]:
    if not usn:
        return {"error": "USN is required"}, 400

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
        return {
            "error": "No data found for student",
            "usn": usn,
            "ai_summary": {},
            "ai_profile": {},
        }, 404

    latest_sem = find_latest_active_semester(student_data)
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
    backlogs, total_backlog_credits = calculate_student_backlogs(student_data)

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

    return {
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
    }, 200


def get_ai_trend_data(usn: str, batch_year: int) -> tuple[dict, int]:
    if not usn:
        return {"error": "USN is required"}, 400

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

    history = extract_sgpa_history(student_data)
    if not history:
        return {"error": "No SGPA history found"}, 404

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

    return {
        "usn": usn,
        "history": {sem: sgpa for sem, sgpa in history},
        "trend": trend,
        "avg_sgpa": round(float(np.mean(sgpas)), 2),
    }, 200


def get_ai_cgpa_prediction(usn: str, batch_year: int) -> tuple[dict, int]:
    if not usn:
        return {"error": "USN is required"}, 400

    sems = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7"]
    history = get_student_history_usn(usn, sems, batch_year)

    if not history:
        return {"error": "No data found"}, 404

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
        pred_info = forecast_academic_performance(history)
        if not pred_info:
            return {"error": "Prediction failed"}, 500
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

    return {"usn": usn, **cgpa_pred}, 200


def get_ai_profile_data(usn: str, lng: str, batch_year: int) -> tuple[dict, int]:
    if not usn:
        return {"error": "USN is required"}, 400

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
        return {"error": "No data found for student"}, 404

    backlogs, total_backlog_credits = calculate_student_backlogs(student_data)

    # Trend & Prediction
    history = extract_sgpa_history(student_data)
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
            pred_info = forecast_academic_performance(history)
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

    tag_avgs, tag_counts, subject_tags = calculate_aggregate_skills(student_data)
    strong_tags, mid_tags, weak_tags = categorize_skill_strengths(tag_avgs)

    latest_sem = find_latest_active_semester(student_data)
    latest_scores = np.array(
        get_clean_marks_list(student_data["semesters"][latest_sem]["ia_marks"])
    ) + np.array(
        get_clean_marks_list(student_data["semesters"][latest_sem]["see_marks"])
    )
    subjects = student_data["semesters"][latest_sem]["subject_names"]
    latest_strong = [sub for sub, mark in zip(subjects, latest_scores) if mark >= 70]
    latest_mid = [sub for sub, mark in zip(subjects, latest_scores) if 40 <= mark < 70]
    latest_weak = [sub for sub, mark in zip(subjects, latest_scores) if mark < 40]

    placement_advice, learning_plan = generate_career_and_learning_recommendations(
        strong_tags, mid_tags, weak_tags, trend_data, cgpa_pred, total_backlog_credits
    )

    t_placement_advice = [translate_text(adv, lng) for adv in placement_advice]
    t_learning_plan = [translate_text(lp, lng) for lp in learning_plan]

    return {
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
    }, 200


# ---------------- ACADEMIC ANALYSIS ALGORITHMS ----------------

# A map of keyword tags to categorize subjects
SKILL_CATEGORIES = {
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


def calculate_student_backlogs(student_record: dict) -> tuple[dict, float]:
    """
    Evaluates student record to extract fail status subjects and count backlog credits.
    """
    backlogs_map = {}
    net_credits = 0.0

    for sem_key, sem_data in student_record.get("semesters", {}).items():
        failed_list = []
        sem_credit_total = 0.0

        zipped_data = zip(
            sem_data.get("ia_marks", []),
            sem_data.get("see_marks", []),
            sem_data.get("credits", []),
            sem_data.get("subject_names", []),
            sem_data.get("pass_fail", []),
        )

        for ia_val, see_val, credit_val, sub_name, pass_status in zipped_data:
            if pass_status == "Fail":
                try:
                    val = float(credit_val) if credit_val is not None else 0.0
                    clean_credit = val if val >= 0.0 else 0.0
                except (ValueError, TypeError):
                    clean_credit = 0.0

                # Sanitize credit boundaries
                if clean_credit > 10.0:
                    clean_credit = 3.0

                failed_list.append(
                    {
                        "subject": sub_name,
                        "internal": ia_val,
                        "external": see_val,
                        "credits": clean_credit,
                    }
                )
                sem_credit_total += clean_credit
                net_credits += clean_credit

        if failed_list:
            backlogs_map[sem_key] = {
                "failed_subjects": failed_list,
                "semester_backlog_credits": sem_credit_total,
            }

    return backlogs_map, net_credits


def find_latest_active_semester(student_record: dict) -> str | None:
    """
    Finds the key representing the student's most recent active semester.
    """
    sem_dict = student_record.get("semesters")
    if sem_dict:
        active_keys = [k for k, d in sem_dict.items() if d.get("sgpa") is not None]
        if active_keys:
            # Order key names numerically (e.g. sem1, sem2)
            active_keys.sort(key=lambda s: int(re.search(r"\d+", s).group() or 0))
            return active_keys[-1]

    # Handle single-semester flat responses
    if "sgpa" in student_record and student_record["sgpa"] is not None:
        url = student_record.get("pdf_url", "")
        match_sem = re.search(r"(sem\d+)", url)
        if match_sem:
            return match_sem.group(1)

    return None


def get_clean_marks_list(marks_data: list | None) -> list[int]:
    """
    Replaces null marks with zero.
    """
    return [int(val) if val is not None else 0 for val in (marks_data or [])]


def extract_sgpa_history(student_record: dict) -> list[tuple[str, float]]:
    """
    Extracts chronological list of past semester SGPA scores.
    """
    semesters = student_record.get("semesters", {})
    sorted_sems = sorted(
        semesters.items(), key=lambda x: int(re.search(r"\d+", x[0]).group() or 0)
    )
    return [(k, float(d["sgpa"])) for k, d in sorted_sems if d.get("sgpa") is not None]


def auto_assign_subject_tags(subject_name: str) -> list[str]:
    """
    Categorizes a subject using fuzzy string match algorithms.
    """
    if not subject_name:
        return []

    query = subject_name.lower()
    matched_tags = []

    for category_tag, keywords in SKILL_CATEGORIES.items():
        for word in keywords:
            if word in query:
                matched_tags.append(category_tag)
                break
            # Fuzzy match threshold
            similarity = fuzz.token_sort_ratio(query, word)
            if similarity >= 70:
                matched_tags.append(category_tag)
                break

    return list(set(matched_tags))


def calculate_aggregate_skills(student_record: dict) -> tuple[dict, dict, dict]:
    """
    Aggregates subject scores based on fuzzy tags.
    """
    totals_map = defaultdict(float)
    counts_map = defaultdict(int)
    resolved_tags = {}

    for sem_key, sem_data in student_record.get("semesters", {}).items():
        ia_list = get_clean_marks_list(sem_data.get("ia_marks"))
        see_list = get_clean_marks_list(sem_data.get("see_marks"))
        subjects_list = sem_data.get("subject_names", [])

        for name, ia_score, see_score in zip(subjects_list, ia_list, see_list):
            combined_score = float(ia_score + see_score)
            tags = auto_assign_subject_tags(name)
            resolved_tags[name] = tags

            if not tags:
                totals_map["other"] += combined_score
                counts_map["other"] += 1
            else:
                for tag in tags:
                    totals_map[tag] += combined_score
                    counts_map[tag] += 1

    averages_map = {}
    for tag_name, total_val in totals_map.items():
        cnt = max(1, counts_map.get(tag_name, 1))
        averages_map[tag_name] = round(total_val / cnt, 2)

    return averages_map, dict(counts_map), resolved_tags


def categorize_skill_strengths(
    skill_averages: dict,
) -> tuple[list[str], list[str], list[str]]:
    """
    Divides skills into strong, moderate, and needs improvement brackets.
    """
    strong, moderate, needs_work = [], [], []
    for tag, avg in skill_averages.items():
        if avg >= 70.0:
            strong.append(tag)
        elif avg >= 40.0:
            moderate.append(tag)
        else:
            needs_work.append(tag)
    return strong, moderate, needs_work


def forecast_academic_performance(sgpa_history: list[tuple[str, float]]) -> dict | None:
    """
    Applies linear Ridge regression to predict subsequent semester SGPA.
    """
    if not sgpa_history or len(sgpa_history) < 2:
        return None

    _, sgpa_scores = zip(*sgpa_history)
    x_matrix = np.arange(1, len(sgpa_scores) + 1).reshape(-1, 1)
    y_vector = np.array(sgpa_scores, dtype=float)

    predictor = Ridge(alpha=1.0)
    predictor.fit(x_matrix, y_vector)

    future_index = np.array([[len(sgpa_scores) + 1]])
    predicted_val = float(predictor.predict(future_index)[0])

    # Residuals standard deviation
    residuals = y_vector - predictor.predict(x_matrix)
    if len(residuals) > 1:
        dev = float(residuals.std(ddof=1))
    else:
        dev = max(0.25, abs(y_vector[0] - predicted_val))

    margin = 1.96 * dev
    lower_bound = max(0.0, predicted_val - margin)
    upper_bound = min(10.0, predicted_val + margin)

    return {
        "predicted_next_sgpa": round(predicted_val, 2),
        "ci_low": round(lower_bound, 2),
        "ci_high": round(upper_bound, 2),
        "model": "ridge",
        "resid_std": round(dev, 3),
    }


def generate_career_and_learning_recommendations(
    strong_areas: list[str],
    moderate_areas: list[str],
    needs_work_areas: list[str],
    trend_analysis: dict,
    prediction_analysis: dict,
    total_backlog_credits: float,
) -> tuple[list[str], list[str]]:
    """
    Formulates custom placement/career path suggestions and target learning actions.
    """
    career_tips = []
    study_recommendations = []

    # Software Engineering Tag Recommendations
    if "programming" in strong_areas:
        career_tips.append(
            "Strong in programming → Good fit for software/coding internships. Focus on DSA, system design basics, and personal projects."
        )
        study_recommendations.append(
            "Practice on coding platforms (DSA), contribute to small projects, build 2-3 demonstrable projects."
        )
    elif "programming" in moderate_areas:
        career_tips.append(
            "Programming is moderate → strengthen algorithms & projects to target coding roles."
        )
        study_recommendations.append(
            "Daily DSA practice (1–2 problems), small project focusing on implementation and debugging."
        )
    elif "programming" in needs_work_areas:
        career_tips.append(
            "Programming is weak → start with fundamentals (syntax, basic algorithms) and small exercises."
        )
        study_recommendations.append(
            "Beginner tutorials + practice problems, pair-programming, small guided projects."
        )

    # Data Roles Recommendations
    if "data" in strong_areas:
        career_tips.append(
            "Good data-oriented skills → consider analytics/data science roles; learn SQL, pandas, and basic ML pipelines."
        )
        study_recommendations.append(
            "Work on data cleaning, SQL queries, mini-ML projects and Kaggle beginner challenges."
        )

    # Math Focus
    if "math" in strong_areas:
        career_tips.append(
            "Strong mathematical foundation → suitable for analytics, research or systems roles requiring quantitative reasoning."
        )
        study_recommendations.append(
            "Practice probability/statistics & linear algebra applied to ML/algorithms."
        )

    # Backlog warnings
    if total_backlog_credits > 0.0:
        career_tips.append(
            "Clear backlogs soon — many recruiters shortlist based on clear academic records."
        )
        study_recommendations.append(
            "Prioritise backlog clearance and short-term revision plans for failed subjects."
        )

    # Trend adjustments
    if trend_analysis:
        if trend_analysis.get("trend") == "Declining":
            career_tips.append(
                "SGPA trend is Declining — identify root causes (attendance, exam prep, fundamentals)."
            )
            study_recommendations.append(
                "Strengthen fundamentals for weak topics, structured weekly study plan, and seek mentoring or extra classes."
            )
        else:
            career_tips.append(
                "SGPA trend is Improving — maintain study routine and strengthen project-based learning."
            )

    # CGPA thresholds
    if prediction_analysis:
        est_cgpa = prediction_analysis.get("predicted_final_cgpa")
        if isinstance(est_cgpa, (int, float)):
            if est_cgpa >= 7.5:
                career_tips.append(
                    "Predicted CGPA is competitive for campus placements at mid-large companies; focus on interview prep & projects."
                )
            elif est_cgpa >= 6.0:
                career_tips.append(
                    "Predicted CGPA is decent — target internships, niche roles and strengthen practical skills & projects."
                )
            else:
                career_tips.append(
                    "Predicted CGPA is low — aim for internships, upskilling courses, and consider certification-based skill proof."
                )

    # General skill gaps
    for tag in needs_work_areas:
        if tag == "communication":
            study_recommendations.append(
                "Work on communication: mock interviews, presentation practice, and resume polish."
            )
        else:
            study_recommendations.append(
                f"Review fundamentals for {tag}, use guided courses and hands-on mini-projects."
            )

    # Deduplicate keeping order
    def clean_uniques(lst):
        seen = set()
        unique_list = []
        for item in lst:
            if item not in seen:
                seen.add(item)
                unique_list.append(item)
        return unique_list

    return clean_uniques(career_tips), clean_uniques(study_recommendations)
