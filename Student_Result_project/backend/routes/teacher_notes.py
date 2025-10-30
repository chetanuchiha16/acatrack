from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename
import tempfile
from models.cloud_utils import upload_pdf_to_supabase, SUPABASE_URL, SUPABASE_KEY, supabase, SUPABASE_BUCKET
from models.helpers import get_batch_year
from logger_config import get_logger


logger = get_logger(__name__)
teacher_notes_bp = Blueprint('teacher_notes', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def build_supabase_file_tree(folder: str = "") -> dict:
    """
    Returns a nested dict: folders as {name: {...}}, PDFs as {name: url string}
    This is what your React expects -- folder = dict, file = pdf url string
    """
    if not (SUPABASE_URL and SUPABASE_KEY and supabase):
        raise RuntimeError("Supabase credentials not loaded.")

    tree = {}
    try:
        entries = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
    except Exception as e:
        logger.error(f"Supabase list error: {e}")
        return tree

    file_list = getattr(entries, "data", entries) if hasattr(entries, "data") else entries
    for entry in file_list:
        name = entry.get("name")
        metadata = entry.get("metadata") or {}
        mimetype = metadata.get("mimetype", "")
        if not name:
            continue
        # If it's a folder
        if mimetype == "application/x-directory" or (not mimetype and not name.lower().endswith('.pdf')):
            subfolder = f"{folder}/{name}" if folder else name
            subtree = build_supabase_file_tree(subfolder)
            if subtree:
                tree[name] = subtree
        # If it's a PDF
        elif name.lower().endswith(".pdf"):
            file_path = f"{folder}/{name}" if folder else name
            url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            tree[name] = url
    return tree

@teacher_notes_bp.route('/auth/Staff/upload_notes', methods=['GET'])
def list_notes():
    try:
        batch_year = get_batch_year()
        relative_path = request.args.get("path", "").strip("/")
        prefix = f"notes/{batch_year}/{relative_path}" if relative_path else f"notes/{batch_year}"
        logger.debug(f"Building file tree for: {prefix}")
        tree = build_supabase_file_tree(prefix)
        logger.debug(f"tree: {tree}")
        return jsonify(tree), 200
    except Exception as e:
        logger.error(f"Error in upload_notes (tree): {e}")
        return jsonify({"error": str(e)}), 500

@teacher_notes_bp.route('/auth/Staff/upload_notes', methods=['POST'])
def upload_note():
    try:
        if 'file' not in request.files:
            logger.error("No file part in upload")
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file in upload")
            return jsonify({"error": "No selected file"}), 400
        if not allowed_file(file.filename):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({"error": "Only PDF files are allowed"}), 400

        filename = secure_filename(file.filename)
        batch_year = get_batch_year()
        relative_path = request.form.get("path", "").strip("/")
        folder = f"notes/{batch_year}/{relative_path}" if relative_path else f"notes/{batch_year}"
        logger.debug(f"Uploading to: {folder}/{filename}")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            file.save(tmp.name)
            tmp.flush()
            try:
                cloud_url = upload_pdf_to_supabase(tmp.name, filename, folder)
                logger.info(f"File uploaded: {cloud_url}")
            except Exception as e:
                logger.error(f"Upload failed: {e}")
                return jsonify({"error": f"Cloud upload failed: {e}"}), 500

        return jsonify({
            "message": "File uploaded successfully",
            "filename": filename,
            "path": f"{batch_year}/{relative_path}" if relative_path else str(batch_year),
            "cloud_url": cloud_url
        }), 200
    except Exception as e:
        logger.error(f"Error in upload_note: {e}")
        return jsonify({"error": str(e)}), 500
