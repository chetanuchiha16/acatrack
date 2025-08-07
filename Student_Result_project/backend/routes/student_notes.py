from flask import Blueprint, jsonify, send_from_directory
import os
from models.paths import notes_dir

# Blueprint for serving student reports
student_notes_bp = Blueprint('notes', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def get_folder_structure(directory):
    structure = {}
    for item in os.listdir(directory):
        path = os.path.join(directory, item)
        if os.path.isdir(path):
            structure[item] = get_folder_structure(path)
        elif allowed_file(item):
            structure[item] = None  # It's a file
    return structure

@student_notes_bp.route('/auth/Student/notes', methods=['GET'])
def list_notes():
    try:
        structure = get_folder_structure(notes_dir)
        return jsonify(structure)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@student_notes_bp.route('/auth/Student/report/<path:filename>', methods=['GET'])
def get_note(filename):
    return send_from_directory(notes_dir, filename)

