from flask import Blueprint, jsonify, request
import os
from werkzeug.utils import secure_filename
from models.paths import notes_dir

# Blueprint for serving student notes & teacher uploads
teacher_notes_bp = Blueprint('teacher_notes', __name__)

# Allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

# Recursively build a nested folder/file tree
def build_file_tree(base_path):
    tree = {}
    if not os.path.exists(base_path):
        return tree
    for entry in os.listdir(base_path):
        entry_path = os.path.join(base_path, entry)
        if os.path.isdir(entry_path):
            tree[entry] = build_file_tree(entry_path)  # folder → recurse
        else:
            tree[entry] = None  # file → leaf
    return tree

# ---------- TEACHER ROUTES ----------

@teacher_notes_bp.route('/auth/Staff/upload_notes', methods=['GET'])
def list_notes():
    try:
        tree = build_file_tree(notes_dir)
        return jsonify(tree), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@teacher_notes_bp.route('/auth/Staff/upload_notes', methods=['POST'])
def upload_note():
    try:
        # Check if a file is in the request
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if not allowed_file(file.filename):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        filename = secure_filename(file.filename)

        # Get folder path from request (frontend sends "path")
        relative_path = request.form.get("path", "").strip("/")
        save_dir = os.path.join(notes_dir, relative_path) if relative_path else notes_dir

        # Ensure directory exists
        os.makedirs(save_dir, exist_ok=True)

        # Save the file to the correct folder
        file.save(os.path.join(save_dir, filename))

        return jsonify({
            "message": "File uploaded successfully",
            "filename": filename,
            "path": relative_path
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
