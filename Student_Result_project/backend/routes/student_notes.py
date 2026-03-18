from flask import Blueprint, jsonify, request, redirect
from utils.cloud import SUPABASE_URL, supabase, SUPABASE_BUCKET, sanitize_folder
from utils.helpers import get_batch_year

student_notes_bp = Blueprint("notes", __name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"


def build_supabase_file_tree(folder: str = "") -> dict:
    """
    Returns a nested dict: folders as {name: {...}}, PDFs as {name: url string}
    """
    tree = {}
    try:
        entries = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
    except Exception as e:
        print(f"Supabase list error: {e}")
        return tree

    file_list = (
        getattr(entries, "data", entries) if hasattr(entries, "data") else entries
    )
    for entry in file_list:
        name = entry.get("name")
        metadata = entry.get("metadata") or {}
        mimetype = metadata.get("mimetype", "")
        if not name:
            continue
        # If folder
        if mimetype == "application/x-directory" or (
            not mimetype and not name.lower().endswith(".pdf")
        ):
            subfolder = f"{folder}/{name}" if folder else name
            subtree = build_supabase_file_tree(subfolder)
            if subtree:
                tree[name] = subtree
        # If PDF file
        elif allowed_file(name):
            file_path = f"{folder}/{name}" if folder else name
            url = (
                f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            )
            tree[name] = url
    return tree


@student_notes_bp.route("/auth/Student/notes", methods=["GET"])
def list_notes():
    """
    List all available notes in a tree structure.
    Uses batch year for correct folder, optionally support "path" param.
    """
    try:
        batch_year = request.args.get("batch", get_batch_year())
        relative_path = sanitize_folder(request.args.get("path", "").strip("/"))
        prefix = (
            f"notes/{batch_year}/{relative_path}"
            if relative_path
            else f"notes/{batch_year}"
        )
        structure = build_supabase_file_tree(prefix)
        return jsonify(structure)
    except Exception:
        return jsonify({"error": "Failed to list notes."}), 500


@student_notes_bp.route("/auth/Student/notes/<path:file_path>", methods=["GET"])
def get_note(file_path):
    """
    Redirects to the public URL of the PDF file stored in Supabase.
    """
    try:
        # Optional: secure path -- do not allow '..'
        if ".." in file_path or file_path.startswith("/"):
            return jsonify({"error": "Invalid path"}), 403

        # Compose Supabase public file URL
        url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/notes/{file_path}"
        # Optionally, you could generate a signed URL instead if files need to be private.

        # Redirect to public URL
        return redirect(url)
    except Exception:
        return jsonify({"error": "Failed to retrieve note."}), 500
