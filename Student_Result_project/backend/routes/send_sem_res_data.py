from flask import Flask, jsonify, request,Blueprint,send_file
from models import University, SubjectResult
from models.paths import db_path, pdf_dir  , get_db_path
from visuals import generate_sem_pdf
import os
from models.fetch import sem_subjects
from flask import session


sem_bp = Blueprint('sem_res',__name__)

@sem_bp.route('/auth/Staff/sem_res', methods=['GET'])
def get_semester_results():
    semester = request.args.get('semester')
    batch_year = session.get("batch_year")  # <-- pulled from session
    if not semester:
        return jsonify({"error": "Missing semester parameter"}), 400
    
    try:
        db_path = get_db_path(batch_year)  # <-- resolves correct DB
        university = University(db_path)
        university.add_students(selected_semester=semester)

        # Example: your semester_subject_msem_bping could come from a DB or config
        semester_subject_mapping = {
            "SEM1": ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BESCK104A", "BETCK105H"],
            "SEM2": ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BSFHK258", "BPLCK205B", "BESCK204C"],
            "SEM3": ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
            "SEM4": ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B", "BCSL456D"]
        }
        subjects = semester_subject_mapping.get(semester, [])
        if not subjects:
            return jsonify({"error": "No subjects found for the selected semester"}), 404

        results = []
        for subject_code in subjects:
            subject_result = SubjectResult(subject_code, semester, university)
            results.append({
                "subject_name":sem_subjects[semester].get(subject_code, "Unknown subject"),
                "subject_code": subject_code,
                "total_students": subject_result.total_students,
                "present_students": subject_result.present_students,
                "absent_students": subject_result.absent_students,
                "pass_percentage": round(subject_result.pass_percentage, 2),
                "fcd_count": subject_result.fcd_count,
                "fc_count": subject_result.fc_count,
                "sc_count": subject_result.sc_count,
                "fail_count": subject_result.fail_count,
            })

        return jsonify({
            "semester": semester,
            "results": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sem_bp.route('/auth/Staff/sem_res/report/<semester>', methods=['GET'])
def download_semester_report(semester):
    semester_subject_mapping = {
                "SEM1": ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BESCK104A", "BETCK105H"],
                "SEM2": ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BSFHK258", "BPLCK205B", "BESCK204C"],
                "SEM3": ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
                "SEM4": ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B", "BCSL456D"]
            }
    pdf_path = os.path.join(pdf_dir, f"{semester}_results.pdf")
    if not os.path.exists(pdf_path):
        # Optionally generate the PDF if it does not exist
        university = University(db_path)
        university.add_students(selected_semester=semester)
        generate_sem_pdf(semester, university, semester_subject_mapping, output_path=pdf_path)
        
    return send_file(pdf_path, as_attachment=True, download_name=f"{semester}_results.pdf")
