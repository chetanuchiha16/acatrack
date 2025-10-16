from flask import Flask, request, jsonify, send_file, Blueprint, session
from models import University, SubjectResult
from models.paths import  pdf_dir  , get_db_path
from visuals import create_subject_report
import os
from models.helpers import get_batch_year
sub_bp = Blueprint('sub_res', __name__)

@sub_bp.route('/auth/Staff/sub_res', methods=['GET'])
def get_subject_results():
    semester = request.args.get('semester')
    subject_code = request.args.get('subject')
    batch_year = get_batch_year()   
    if not semester or not subject_code:
        return jsonify({"error": "semester and subject are required"}), 400
    
    db_path = get_db_path(batch_year)  # <-- resolves correct DB
    university = University(db_path)
    university.add_students(selected_semester=semester)
    subject_result = SubjectResult(subject_code, semester, university)

    result_data = subject_result.get_subject_results_dict()

    return jsonify(result_data)

@sub_bp.route('/auth/Staff/sub_res/report', methods=['GET'])
def get_subject_report_pdf():
    token = request.headers.get("Authorization")
    print("DEBUG: Authorization header =", token)
    batch_year = get_batch_year()
    semester = request.args.get('semester')
    subject_code = request.args.get('subject')

    if not semester or not subject_code:
        return jsonify({"error": "semester and subject are required"}), 400
    db_path = get_db_path(batch_year)
    university = University(db_path)
    university.add_students(selected_semester=semester)
    subject_result = SubjectResult(subject_code, semester, university)

    pdf_filename = f"subject_report_{semester}_{subject_code}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    create_subject_report(subject_result, file_path=pdf_path)

    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=True)
    else:
        return jsonify({"error": "PDF not generated"}), 500
