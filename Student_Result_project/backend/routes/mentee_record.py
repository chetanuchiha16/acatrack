from flask import Blueprint, request, jsonify, send_from_directory, current_app
import fitz
import os
from models.paths import pdf_dir, img_dir, base_dir

UPLOAD_FOLDER = pdf_dir

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
mentee_record_bp = Blueprint('mentee', __name__, url_prefix='/mentee')

TEMPLATE_PATH = str(base_dir / "Inputs" / "New_mentor_Record[final].pdf")


# --- Upload and fill PDF ---
@mentee_record_bp.route('/upload_form', methods=['POST'])
def upload_form():
    data = request.get_json()

    name = data.get("name")
    usn = data.get("usn")
    mentor_name = data.get("mentor_name")
    mentor_phone = data.get("mentor_phone")
    temporary_address = data.get("temporary_address")
    permanent_address = data.get("permanent_address")
    phone_number = data.get("phone_number")
    email = data.get("email")
    
    father_name = data.get("father_name")
    Contact = data.get("Contact")
    Occupation = data.get("Occupation")
    mother_name = data.get("mother_name")
    Contact_Mother = data.get("Contact_(Mother)")
    Occupation_Mother = data.get("Occupation_(Mother)")

    sgpas = data.get("sgpa", [])  # Array of 8 SGPA values
    projects = data.get("projects", [])  # List of dicts
    internships = data.get("internships", [])  # List of dicts
    activities = data.get("activities", [])  # List of dicts
    summary = data.get("summary", {})  # dict of cultural, co_curricular, hackathon, coding, others

    pdf = fitz.open(TEMPLATE_PATH)

    # ---------- Page 1: Personal Info ----------
    page = pdf[0]
    page.insert_text((160, 205), name or "")
    page.insert_text((135, 230), usn or "")
    page.insert_text((160, 260), mentor_name or "")
    page.insert_text((160, 285), mentor_phone or "")
    page.insert_text((50, 400), temporary_address or "")
    page.insert_text((175, 400), permanent_address or "")
    page.insert_text((330, 425), phone_number or "")
    page.insert_text((425, 425), email or "")
    page.insert_text((70, 595), father_name or "")
    page.insert_text((180, 595), Contact or "")
    page.insert_text((290, 560), Occupation or "")
    page.insert_text((360, 595), mother_name or "")
    page.insert_text((425, 595), Contact_Mother or "")
    page.insert_text((495, 560), Occupation_Mother or "")

    # SGPA
    coords = [(60, 760), (135, 760), (190, 760), (250, 760), 
              (330, 760), (390, 760), (450, 760), (520, 760)]
    for i, sgpa in enumerate(sgpas):
        if i < len(coords):
            page.insert_text(coords[i], str(sgpa or ""))

    # ---------- Page 2: Projects & Internships ----------
    page = pdf[1]
    # Projects table starts at y=135, increments by ~45 per row
    for i, proj in enumerate(projects):
        y = 135 + i*45
        page.insert_text((105, y), proj.get("company", ""))
        page.insert_text((225, y), proj.get("address", ""))
        page.insert_text((340, y), proj.get("duration", ""))
        page.insert_text((450, y), proj.get("stipend", ""))

    # Internships table starts at y=490, increments by ~40 per row
    for i, intern in enumerate(internships):
        y = 490 + i*40
        page.insert_text((105, y), intern.get("company", ""))
        page.insert_text((225, y), intern.get("address", ""))
        page.insert_text((340, y), intern.get("duration", ""))
        page.insert_text((450, y), intern.get("stipend", ""))

    # ---------- Page 3: Activities ----------
    page = pdf[2]
    for i, act in enumerate(activities):
        y = 180 + i*75
        page.insert_text((105, y), act.get("sports", ""))
        page.insert_text((215, y), act.get("conference", ""))
        page.insert_text((335, y), act.get("papers", ""))
        page.insert_text((455, y), act.get("certifications", ""))

    # Summary row
    page.insert_text((90, 645), summary.get("cultural_activities", ""))
    page.insert_text((185, 645), summary.get("co_curricular_activities", ""))
    page.insert_text((280, 645), summary.get("hackathon", ""))
    page.insert_text((370, 645), summary.get("coding_competitions", ""))
    page.insert_text((460, 645), summary.get("other_achievements", ""))

    # Save file
    filename = f"{usn}_{name}_record.pdf"
    output_path = os.path.join(UPLOAD_FOLDER, filename)
    pdf.save(output_path)
    pdf.close()


    return jsonify({"status": "success", "filename": filename})

def get_mentee_pdf_filename(mentee):
    return f"{mentee.username}_{mentee.name}_record.pdf"


# ---------- List all uploaded files ----------
@mentee_record_bp.route('/files', methods=['GET'])
def files():
    files = os.listdir(current_app.config['UPLOAD_FOLDER'])
    return jsonify(files)

# ---------- Download a PDF ----------
@mentee_record_bp.route('/download/<filename>', methods=['GET'])
def download(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# ---------- mentor viewing pdf ----------
@mentee_record_bp.route('/mentor/<int:mentor_id>/pdfs', methods=['GET'])
def list_mentor_pdfs(mentor_id):
    from models import StudentAuth  # import your models

    try:
        # Get all students under this mentor
        mentees = StudentAuth.query.filter_by(mentor_id=mentor_id).all()

        files = []
        for mentee in mentees:
            filename = f"{mentee.username}_{mentee.name}_record.pdf"
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                files.append({
                    "usn": mentee.username,
                    "name": mentee.name,
                    "file": filename
                })

        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- mentor viewing/downloading pdf ----------
@mentee_record_bp.route('/mentor/<int:mentor_id>/download/<usn>', methods=['GET'])
def download_mentee_pdf(mentor_id, usn):
    from models import StudentAuth  # import your models

    # Check student exists
    student = StudentAuth.query.filter_by(username=usn).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Ensure the logged-in mentor owns this student
    if student.mentor_id != mentor_id:
        return jsonify({"error": "Access denied"}), 403

    # Construct filename directly (no helper function needed)
    filename = f"{student.username}_{student.name}_record.pdf"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    # Send file to view inline in browser (mentor can also download via browser)
    return send_from_directory(
        directory=UPLOAD_FOLDER,
        path=filename,
        as_attachment=False,  # False => inline viewing
        mimetype="application/pdf"
    )

