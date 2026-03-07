from flask import Flask, jsonify, request, send_file, Blueprint, session
from models import University
from visuals import create_toppers_list_pdf, create_university_report
from models.paths import  pdf_dir  , get_db_path, postgres_db_url
from io import BytesIO
from logger_config import get_logger

logger = get_logger(__name__)

from models.helpers import get_batch_year

uni_bp = Blueprint('uni', __name__)

@uni_bp.route('/auth/Staff/overall_res', methods=['GET'])
def get_academic_performance():
    semester = request.args.get('semester')
    show_toppers = request.args.get('show_toppers', 'false').lower() == 'true'
    show_failed = request.args.get('show_failed', 'false').lower() == 'true'
    format_type = request.args.get('format', 'json').lower() # default is JSON
    batch_year = request.args.get('batch_year') or get_batch_year()   

    try:
        db_path = get_db_path(batch_year)
        logger.debug(f"{db_path} from university 1")
        logger.debug(f"Batch year in session: {get_batch_year()}" )
        university = University(postgres_url=postgres_db_url, batch_year=batch_year)
        university.add_students(semester)
        result = university.calculate_academic_performance_by_semester(semester)

        if show_toppers:
            toppers = sorted(result, key=lambda x: x['percentage'], reverse=True)[:10]
            if format_type == 'pdf':
                # Create in-memory PDF for the top 10 students
                # --- assume create_toppers_list_pdf returns bytes instead of saving ---
                pdf_bytes = create_toppers_list_pdf(toppers, semester) # <--- SHOULD RETURN bytes, not save to disk
                pdf_buffer = BytesIO(pdf_bytes)
                pdf_buffer.seek(0)
                return send_file(
                    pdf_buffer,
                    as_attachment=True,
                    download_name=f"{semester}_toppers_list.pdf",
                    mimetype="application/pdf"
                )    
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
    batch_year = request.args.get('batch_year') or get_batch_year()
    university = University(postgres_url=postgres_db_url, batch_year=batch_year)
    university.add_students(semester)

    # ✅ Generate PDF in-memory
    pdf_bytes = create_university_report(university, semester)
    from io import BytesIO
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"{semester}_report.pdf",
        mimetype="application/pdf"
    )

