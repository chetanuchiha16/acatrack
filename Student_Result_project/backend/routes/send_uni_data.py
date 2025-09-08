from flask import Flask, jsonify, request, send_file, Blueprint, session
from models import University
from visuals import create_toppers_list_pdf, create_university_report
from models.paths import db_path, pdf_dir  , get_db_path


uni_bp = Blueprint('uni', __name__)

@uni_bp.route('/auth/Staff/overall_res', methods=['GET'])
def get_academic_performance():
    semester = request.args.get('semester')
    show_toppers = request.args.get('show_toppers', 'false').lower() == 'true'
    show_failed = request.args.get('show_failed', 'false').lower() == 'true'
    batch_year = session.get("batch_year")  # <-- pulled from session

    try:
        db_path = get_db_path(batch_year)  # <-- resolves correct DB
        print(f"{db_path} from university 1")
        print("Batch year in session:", session.get("batch_year"))
        university = University(db_path=db_path)
        university.add_students(semester)
        result = university.calculate_academic_performance_by_semester(semester)

        if show_toppers:
            toppers = sorted(result, key=lambda x: x['percentage'], reverse=True)[:10]
            # optionally generate and serve PDF, or send data as JSON
            create_toppers_list_pdf(toppers, semester, file_path=f"{pdf_dir}/{semester}_toppers_list.pdf")
            return jsonify(toppers)
        
        elif show_failed:
            failed_students = university.find_failed_students(semester)
            return jsonify(failed_students)
        
        else:
            return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@uni_bp.route('/auth/Staff/report/<semester>')
def get_report(semester):
    file_path = f"{pdf_dir}/{semester}_report.pdf"
    print("Batch year in session:", session.get("batch_year"))
    batch_year = session.get("batch_year")  # <-- pulled from session
    db_path = get_db_path(batch_year)  # <-- resolves correct DB
    # generate report PDF if not exists
    university = University(db_path=db_path)
    university.add_students(semester)
    create_university_report(university, semester, file_path=file_path)
    return send_file(file_path, as_attachment=True)
