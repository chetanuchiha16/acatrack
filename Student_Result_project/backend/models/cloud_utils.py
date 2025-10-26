import os
from io import BytesIO
from pathlib import Path
from supabase import create_client
from werkzeug.utils import secure_filename
from matplotlib.figure import Figure

# === Environment Setup ===
BASE_DIR = Path(__file__).resolve().parent.parent
IS_PRODUCTION = os.getenv("RENDER") == "true"  # Render sets this automatically

# Local directories
IMG_DIR = BASE_DIR / "Outputs" / "Images"
PDF_DIR = BASE_DIR / "Outputs" / "PDFs"
NOTES_DIR = BASE_DIR / "Outputs" / "NOTES"

# Create folders locally if not hosted
if not IS_PRODUCTION:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    NOTES_DIR.mkdir(parents=True, exist_ok=True)

# === Supabase Setup ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "uploads")

supabase = None
if IS_PRODUCTION and SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# === Core Helper: Upload to Supabase ===
def upload_to_supabase(file_bytes: bytes, file_name: str, folder: str = "") -> str:
    """Uploads a file to Supabase Storage and returns its public URL."""
    if not supabase:
        raise RuntimeError("Supabase client not initialized.")
    file_path = f"{folder}/{file_name}" if folder else file_name
    response = supabase.storage.from_(SUPABASE_BUCKET).upload(file_path, file_bytes)
    if response.get("error"):
        raise Exception(response["error"]["message"])
    public = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(file_path)
    return public.get("publicUrl")

# === Smart File Save ===
def save_file(file, filename: str, folder: str = "files") -> str:
    """Handles both user uploads and generated files."""
    filename = secure_filename(filename)
    if IS_PRODUCTION:
        file_bytes = file.read() if hasattr(file, "read") else file
        return upload_to_supabase(file_bytes, filename, folder)
    else:
        save_path = (IMG_DIR / filename) if folder == "files" else (BASE_DIR / folder / filename)
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
        return upload_to_supabase(buf.read(), filename, folder)
    else:
        save_path = IMG_DIR / filename
        fig.savefig(save_path)
        return str(save_path)
