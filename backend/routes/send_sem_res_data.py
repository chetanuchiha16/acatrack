from io import BytesIO

from flask import Blueprint, jsonify, request, send_file
from services.results_service import SubjectResult
from services.university_service import University
from services.fetch_service import sem_subjects
from utils.helpers import get_batch_year
from models.paths import postgres_db_url
from visuals import generate_sem_pdf
from extensions import cache
from logger_config import get_logger

logger = get_logger(__name__)

sem_bp = Blueprint("sem_res", __name__)


@sem_bp.route("/auth/Staff/sem_res", methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def get_semester_results():
    semester = request.args.get("semester")
    batch_year = request.args.get("batch_year") or get_batch_year()
    if not semester:
        return jsonify({"error": "Missing semester parameter"}), 400

    try:
        # Map of subjects for this semester
        semester_subject_mapping = {
            "sem1": [
                "BMATS101",
                "BCHES102",
                "BCEDK103",
                "BENGK106",
                "BICOK107",
                "BIDTK158",
                "BPLCK105B",
                "BESCK104C",
                "BESCK104A",
                "BETCK105H",
            ],
            "sem2": [
                "BMAT201",
                "BPHYS202",
                "BPOPS203",
                "BPWSK206",
                "BKSKK207",
                "BKBKK207",
                "BSFHK258",
                "BPLCK205B",
                "BESCK204C",
                "BESCK204D",
                "BETCK205H",
            ],
            "sem3": [
                "BCS301",
                "BCS302",
                "BCS303",
                "BCS304",
                "BCSL305",
                "BSCK307",
                "BNSK359",
                "BCS306A",
                "BCS358D",
            ],
            "sem4": [
                "BCS401",
                "BCS402",
                "BCS403",
                "BCSL404",
                "BBOC407",
                "BUHK408",
                "BPEK459_PhysicalEducation_OR_BNSK459_NSS_",
                "BCS405B",
                "BCSL456D",
            ],
        }

        subjects = semester_subject_mapping.get(semester, [])
        if not subjects:
            return jsonify(
                {"error": "No subjects found for the selected semester"}
            ), 404

        # Use the University model which automatically handles the normalized DB fetch
        university = University(postgres_url=postgres_db_url, batch_year=batch_year)

        students = university.get_students_for_semester(selected_semester=semester)
        if not students:
            return jsonify(
                {"error": f"No data found for {semester} in batch {batch_year}"}
            ), 404

        results = []
        for subject_code in subjects:
            subject_result = SubjectResult(
                subject_code, semester, university, students=students
            )

            # Skip returning empty stats if no students took the subject
            if (
                subject_result.total_students == 0
                and subject_result.present_students == 0
            ):
                continue

            results.append(
                {
                    "subject_name": sem_subjects[semester].get(
                        subject_code, "Unknown subject"
                    ),
                    "subject_code": subject_code,
                    "total_students": subject_result.total_students,
                    "present_students": subject_result.present_students,
                    "absent_students": subject_result.absent_students,
                    "pass_percentage": round(subject_result.pass_percentage, 2),
                    "fcd_count": subject_result.fcd_count,
                    "fc_count": subject_result.fc_count,
                    "sc_count": subject_result.sc_count,
                    "fail_count": subject_result.fail_count,
                }
            )

        return jsonify({"semester": semester, "results": results})

    except Exception:
        logger.exception("Error in get_semester_results")
        return jsonify({"error": "Failed to fetch semester results."}), 500


@sem_bp.route("/auth/Staff/sem_res/report/<semester>", methods=["GET"])
@cache.cached(timeout=3600)
def download_semester_report(semester):
    batch_year = request.args.get("batch_year") or get_batch_year()
    semester_subject_mapping = {
        "sem1": [
            "BMATS101",
            "BCHES102",
            "BCEDK103",
            "BENGK106",
            "BICOK107",
            "BIDTK158",
            "BPLCK105B",
            "BESCK104C",
            "BESCK104A",
            "BETCK105H",
        ],
        "sem2": [
            "BMAT201",
            "BPHYS202",
            "BPOPS203",
            "BPWSK206",
            "BKSKK207",
            "BKBKK207",
            "BSFHK258",
            "BPLCK205B",
            "BESCK204C",
            "BESCK204D",
            "BETCK205H",
        ],
        "sem3": [
            "BCS301",
            "BCS302",
            "BCS303",
            "BCS304",
            "BCSL305",
            "BSCK307",
            "BNSK359",
            "BCS306A",
            "BCS358D",
        ],
        "sem4": [
            "BCS401",
            "BCS402",
            "BCS403",
            "BCSL404",
            "BBOC407",
            "BUHK408",
            "BPEK459_PhysicalEducation_OR_BNSK459_NSS_",
            "BCS405B",
            "BCSL456D",
        ],
    }

    # Generate the PDF in-memory
    university = University(postgres_url=postgres_db_url, batch_year=batch_year)
    pdf_bytes = generate_sem_pdf(semester, university, semester_subject_mapping)
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"{semester}_results.pdf",
        mimetype="application/pdf",
    )
