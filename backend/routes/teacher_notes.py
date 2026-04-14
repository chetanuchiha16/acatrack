from fastapi import APIRouter, Request, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
import tempfile
from utils.cloud import upload_pdf_to_supabase, SUPABASE_URL, SUPABASE_KEY, supabase, SUPABASE_BUCKET, sanitize_folder
from utils.helpers import get_batch_year_from_request
from logger_config import get_logger
import asyncio

logger = get_logger(__name__)
router = APIRouter(tags=["teacher_notes"])


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"


def build_supabase_file_tree(folder: str = "") -> dict:
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
        if mimetype == "application/x-directory" or (not mimetype and not name.lower().endswith(".pdf")):
            subfolder = f"{folder}/{name}" if folder else name
            subtree = build_supabase_file_tree(subfolder)
            if subtree:
                tree[name] = subtree
        elif name.lower().endswith(".pdf"):
            file_path = f"{folder}/{name}" if folder else name
            url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            tree[name] = url
    return tree


@router.get("/auth/Staff/upload_notes")
async def list_notes(request: Request, path: str = Query("")):
    try:
        batch_year = get_batch_year_from_request(request)
        relative_path = sanitize_folder(path.strip("/"))
        prefix = f"notes/{batch_year}/{relative_path}" if relative_path else f"notes/{batch_year}"
        logger.debug(f"Building file tree for: {prefix}")
        tree = await asyncio.get_event_loop().run_in_executor(
            None, build_supabase_file_tree, prefix
        )
        logger.debug(f"tree: {tree}")
        return tree
    except Exception:
        logger.exception("Error in upload_notes (tree)")
        return JSONResponse(content={"error": "Failed to list notes."}, status_code=500)


@router.post("/auth/Staff/upload_notes")
async def upload_note(request: Request, file: UploadFile = File(...), path: str = Form("")):
    try:
        if not file.filename:
            return JSONResponse(content={"error": "No selected file"}, status_code=400)
        if not allowed_file(file.filename):
            return JSONResponse(content={"error": "Only PDF files are allowed"}, status_code=400)

        from pathlib import Path as P
        filename = P(file.filename).name  # secure filename

        batch_year = get_batch_year_from_request(request)
        relative_path = sanitize_folder(path.strip("/"))
        folder = f"notes/{batch_year}/{relative_path}" if relative_path else f"notes/{batch_year}"
        logger.debug(f"Uploading to: {folder}/{filename}")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp.flush()
            try:
                cloud_url = await asyncio.get_event_loop().run_in_executor(
                    None, upload_pdf_to_supabase, tmp.name, filename, folder
                )
                logger.info(f"File uploaded: {cloud_url}")
            except Exception:
                logger.exception("Upload failed")
                return JSONResponse(content={"error": "Cloud upload failed."}, status_code=500)

        return {
            "message": "File uploaded successfully",
            "filename": filename,
            "path": f"{batch_year}/{relative_path}" if relative_path else str(batch_year),
            "cloud_url": cloud_url,
        }
    except Exception:
        logger.exception("Error in upload_note")
        return JSONResponse(content={"error": "Failed to upload note."}, status_code=500)
