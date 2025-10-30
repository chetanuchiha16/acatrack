#cloud_utils.py
import os
from io import BytesIO
from pathlib import Path
from supabase import create_client
from werkzeug.utils import secure_filename
from matplotlib.figure import Figure
import requests
from logger_config import get_logger

logger = get_logger(__name__)

# === Environment Setup ===
os.environ["RENDER"] = "true"  # force production mode locally

BASE_DIR = Path(__file__).resolve().parent.parent
IS_PRODUCTION = os.getenv("RENDER") == "true"  # Render sets this automatically

# Local directories
IMG_DIR = BASE_DIR / "Outputs" / "Images"
PDF_DIR = BASE_DIR / "Outputs" / "PDFs"
NOTES_DIR = BASE_DIR / "Outputs" / "NOTES"

# Create folders locally if not in production
if not IS_PRODUCTION:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    NOTES_DIR.mkdir(parents=True, exist_ok=True)

# === Supabase Setup ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = "uploads"

supabase = None
if IS_PRODUCTION and SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# === Helper: Upload to Supabase ===
def upload_to_supabase(file_bytes: bytes, file_name: str, folder: str = "", content_type: str = "application/pdf") -> str:
    """
    Uploads a file to Supabase Storage via direct HTTP POST to set proper content type.
    Returns public URL.
    """
    if not (SUPABASE_URL and SUPABASE_KEY):
        raise RuntimeError("Supabase credentials not loaded.")

    file_path = f"{folder}/{secure_filename(file_name)}" if folder else secure_filename(file_name)

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "X-Upsert": "true",   # <-- ADD THIS LINE
    }
    res = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{file_path}",   # you can remove ?upsert=true if present
        headers=headers,
        data=file_bytes
    )

    if res.status_code not in [200, 201]:
        raise Exception(f"Supabase upload failed: {res.status_code} {res.text}")
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
    return public_url


# === Smart File Save ===
def save_file(file, filename: str, folder: str = "files") -> str:
    """Handles both user uploads and generated files (PDFs, images, etc)."""
    filename = secure_filename(filename)
    file_bytes = file.read() if hasattr(file, "read") else file
    if IS_PRODUCTION:
        content_type = "application/pdf" if filename.lower().endswith(".pdf") else "image/png"
        return upload_to_supabase(file_bytes, filename, folder, content_type=content_type)
    else:
        # Map folder names to proper paths
        if folder == "files":
            local_folder = IMG_DIR
        elif folder.lower() in ["pdfs"]:
            local_folder = PDF_DIR
        elif folder.lower() in ["images", "imgs"]:
            local_folder = IMG_DIR
        else:
            local_folder = PDF_DIR / folder
        local_folder.mkdir(parents=True, exist_ok=True)
        save_path = local_folder / filename
        with open(save_path, "wb") as f:
            if hasattr(file, "read"):
                f.write(file.read())
            else:
                f.write(file)
        return str(save_path)

# === Save Matplotlib Figures ===
def save_plot(fig: Figure, filename: str, folder: str = "plots") -> str:
    """Saves matplotlib figures locally or to Supabase Storage."""
    filename = secure_filename(filename)
    if IS_PRODUCTION:
        buf = BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        return upload_to_supabase(buf.read(), filename, folder, content_type="image/png")
    else:
        save_path = IMG_DIR / filename
        fig.savefig(save_path)
        return str(save_path)

import tempfile

def download_excel_from_supabase(excel_filename: str, folder: str) -> str:
    """Downloads an Excel file from Supabase to a local temp path. Returns local path."""
    if not (SUPABASE_URL and SUPABASE_KEY and supabase):
        raise RuntimeError("Supabase credentials not loaded.")
    res = supabase.storage.from_(SUPABASE_BUCKET).download(f"{folder}/{secure_filename(excel_filename)}")
    fd, temp_path = tempfile.mkstemp(suffix=".xlsx")
    with os.fdopen(fd, "wb") as tmp:
        tmp.write(res)
    return temp_path

def excel_exists_in_supabase(excel_filename: str, folder: str) -> bool:
    """Checks if Excel file exists in Supabase Storage."""
    files = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
    return secure_filename(excel_filename) in [f['name'] for f in files]

def upload_pdf_to_supabase(local_pdf_path: str, usn: str, folder: str):
    """Uploads a local PDF to Supabase Storage and returns the public URL."""
    with open(local_pdf_path, "rb") as f:
        return upload_to_supabase(f.read(), f"{usn}.pdf", folder, content_type="application/pdf")

def upload_excel_to_supabase(local_excel_path: str, excel_filename: str, folder: str):
    """Uploads a local Excel file to Supabase Storage and returns the public URL."""
    with open(local_excel_path, "rb") as f:
        return upload_to_supabase(f.read(), excel_filename, folder, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

def list_supabase_file_tree(folder: str = "") -> dict:
    """
    Recursively lists folders/files (.pdf only) in Supabase Storage under the specified folder.
    Only non-empty folders, and files ending with '.pdf' are shown.
    """
    if not (SUPABASE_URL and SUPABASE_KEY and supabase):
        raise RuntimeError("Supabase credentials not loaded.")

    tree = {}
    try:
        files = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
    except Exception as e:
        raise RuntimeError(f"Supabase list error: {e}")

    if not isinstance(files, list):
        return tree

    for entry in files:
        if not entry or not isinstance(entry, dict):
            continue
        name = entry.get('name')
        metadata = entry.get('metadata') or {}
        mimetype = metadata.get('mimetype', '')

        # Recurse into real folders/directories only
        if mimetype == "application/x-directory":
            subfolder = f"{folder}/{name}" if folder else name
            sub_tree = list_supabase_file_tree(subfolder)
            if sub_tree:
                tree[name] = sub_tree
        # Add only PDFs as files
        elif name and name.lower().endswith('.pdf'):
            file_path = f"{folder}/{name}" if folder else name
            url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            tree[name] = url
    return tree

