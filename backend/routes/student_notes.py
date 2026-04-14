from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, RedirectResponse
from utils.cloud import SUPABASE_URL, supabase, SUPABASE_BUCKET, sanitize_folder
from utils.helpers import get_batch_year_from_request

router = APIRouter(tags=["student_notes"])


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"


def build_supabase_file_tree(folder: str = "") -> dict:
    tree = {}
    try:
        entries = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
    except Exception as e:
        print(f"Supabase list error: {e}")
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
        elif allowed_file(name):
            file_path = f"{folder}/{name}" if folder else name
            url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            tree[name] = url
    return tree


@router.get("/auth/Student/notes")
async def list_notes(request: Request, batch: str | None = Query(None), path: str = Query("")):
    try:
        batch_year = batch or get_batch_year_from_request(request)
        relative_path = sanitize_folder(path.strip("/"))
        prefix = f"notes/{batch_year}/{relative_path}" if relative_path else f"notes/{batch_year}"

        import asyncio
        structure = await asyncio.get_event_loop().run_in_executor(
            None, build_supabase_file_tree, prefix
        )
        return structure
    except Exception:
        return JSONResponse(content={"error": "Failed to list notes."}, status_code=500)


@router.get("/auth/Student/notes/{file_path:path}")
async def get_note(file_path: str):
    try:
        if ".." in file_path or file_path.startswith("/"):
            return JSONResponse(content={"error": "Invalid path"}, status_code=403)

        url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/notes/{file_path}"
        return RedirectResponse(url)
    except Exception:
        return JSONResponse(content={"error": "Failed to retrieve note."}, status_code=500)
