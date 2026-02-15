from flask import Blueprint, request, jsonify, redirect
import fitz
import os
from models.paths import pdf_dir, img_dir, base_dir
from models.cloud_utils import save_file, supabase, SUPABASE_BUCKET
from backend.models.schema import StudentAuth
from logger_config import get_logger

logger = get_logger(__name__)
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
    Contact_Mother = data.get("Contact_Mother")
    Occupation_Mother = data.get("Occupation_Mother")
    sgpas = data.get("sgpa", [])  # Array of 8 SGPA values
    projects = data.get("projects", [])  # List of dicts
    internships = data.get("internships", [])  # List of dicts
    activities = data.get("activities", [])  # List of dicts
    summary = data.get("summary", {})  # dict of cultural, co_curricular, hackathon, coding, others

    pdf = fitz.open(TEMPLATE_PATH)
    # --- Page 1: Personal Info ---
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
    page.insert_text((495, 595), Occupation_Mother or "")
    logger.debug(f"mother: {Contact_Mother} and {Occupation_Mother}")

    # SGPA
    coords = [(60, 760), (135, 760), (190, 760), (250, 760),
              (330, 760), (390, 760), (450, 760), (520, 760)]
    for i, sgpa in enumerate(sgpas):
        if i < len(coords):
            page.insert_text(coords[i], str(sgpa or ""))

    # --- Page 2: Projects & Internships ---
    page = pdf[1]
    for i, proj in enumerate(projects):
        y = 135 + i*45
        page.insert_text((105, y), proj.get("company", ""))
        page.insert_text((225, y), proj.get("address", ""))
        page.insert_text((340, y), proj.get("duration", ""))
        page.insert_text((450, y), proj.get("stipend", ""))

    for i, intern in enumerate(internships):
        y = 490 + i*40
        page.insert_text((105, y), intern.get("company", ""))
        page.insert_text((225, y), intern.get("address", ""))
        page.insert_text((340, y), intern.get("duration", ""))
        page.insert_text((450, y), intern.get("stipend", ""))

    # --- Page 3: Activities ---
    page = pdf[2]
    for i, act in enumerate(activities):
        y = 180 + i*75
        page.insert_text((105, y), act.get("Sports", ""))
        page.insert_text((215, y), act.get("conference_details", ""))
        page.insert_text((335, y), act.get("papers_published", ""))
        page.insert_text((455, y), act.get("certifications_from_MOOC", ""))


    # Summary row
    page.insert_text((90, 645), summary.get("cultural_activities", ""))
    page.insert_text((185, 645), summary.get("co_curricular_activities", ""))
    page.insert_text((280, 645), summary.get("hackathon", ""))
    page.insert_text((370, 645), summary.get("coding_competitions", ""))
    page.insert_text((460, 645), summary.get("other_achievements", ""))

    # Save file to Supabase or local
    filename = f"{usn}_{name}_record.pdf"
    pdf_bytes = pdf.write()  # get PDF as bytes
    pdf.close()
    file_url = save_file(pdf_bytes, filename, folder="pdfs")  # handles local vs Supabase

    return jsonify({"status": "success", "file": file_url})

def get_mentee_pdf_filename(mentee):
    safe_name = mentee.name.replace(" ", "_")  # Convert spaces to underscores
    return f"{mentee.username}_{safe_name}_record.pdf"

# ------ List all uploaded files ------
@mentee_record_bp.route('/files', methods=['GET'])
def files():
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 500

    # List all files in "pdfs" folder inside "uploads" bucket
    response = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})

    # Debug print (optional)
    print("List Response:", getattr(response, "data", []))

    # Only include actual PDF files (exclude placeholders and hidden files)
    pdf_names = [
        f["name"]
        for f in getattr(response, "data", [])
        if f["name"] != ".emptyFolderPlaceholder"
           and f["name"].lower().endswith(".pdf")
    ]
    logger.debug(f"pdf names {pdf_names}")
    return jsonify(pdf_names)


# ------ Download a PDF ------
@mentee_record_bp.route('/download/<filename>', methods=['GET'])
def download(filename):
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 500

    response = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(f"pdfs/{filename}", 3600)
    signed_url = getattr(response, "data", {}).get("signedURL") if hasattr(response, "data") else None
    if not signed_url:
        return jsonify({"error": "File not found"}), 404
    return jsonify({"file_url": signed_url})

@mentee_record_bp.route('/mentor/<int:mentor_id>/pdfs', methods=['GET'])
def list_mentor_pdfs(mentor_id):
    try:
        mentees = StudentAuth.query.filter_by(mentor_id=mentor_id).all()

        # List all PDFs in "pdfs" folder. Response is a plain list.
        response = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})

        # Collect all actual PDF filenames (exclude placeholders)
        pdf_names = [
            f["name"] for f in response
            if f["name"] != ".emptyFolderPlaceholder"
               and f["name"].lower().endswith(".pdf")
        ]

        files = []
        for mentee in mentees:
            filename = get_mentee_pdf_filename(mentee)  # e.g. "1JS23CS032_CHETAN_KISHOR_C_G_record.pdf"
            logger.debug(f"filename: {filename}")
            logger.debug(f"pdf names: {pdf_names}")
            if filename in pdf_names:
                # Create signed URL for private download (expires in 1 hour)
                file_resp = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(f"pdfs/{filename}", 3600)
                url = file_resp.get("signedURL") if isinstance(file_resp, dict) else getattr(file_resp, "data", {}).get("signedURL")
                files.append({
                    "usn": mentee.username,
                    "name": mentee.name,
                    "file_url": url
                })
        logger.debug(f"files: {files}")
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@mentee_record_bp.route('/mentor/<int:mentor_id>/download/<usn>', methods=['GET'])
def download_mentee_pdf(mentor_id, usn):
    student = StudentAuth.query.filter_by(username=usn).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404
    if student.mentor_id != mentor_id:
        return jsonify({"error": "Access denied"}), 403

    filename = get_mentee_pdf_filename(student)
    response = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})
    pdf_names = [
        f["name"] for f in response
        if f["name"] != ".emptyFolderPlaceholder" and f["name"].lower().endswith(".pdf")
    ]
    if filename not in pdf_names:
        return jsonify({"error": "PDF not found"}), 404

    file_resp = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(f"pdfs/{filename}", 3600)
    signed_url = file_resp.get("signedURL") if isinstance(file_resp, dict) else getattr(file_resp, "data", {}).get("signedURL")
    if not signed_url:
        return jsonify({"error": "File not found"}), 404

    return jsonify({"file_url": signed_url})


