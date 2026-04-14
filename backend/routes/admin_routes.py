"""
Admin routes for generating accounts, uploading email lists, and uploading mentor mappings.
"""
from __future__ import annotations

import io
import os
import tempfile
import base64
import hashlib
from cryptography.fernet import Fernet

from fastapi import APIRouter, Request, UploadFile, File, Header, Query
from fastapi.responses import JSONResponse, StreamingResponse
from logger_config import get_logger
from models import Mentor, ParentAuth, StudentAuth, Teacher
from models.schema import ExportCache
from services.admin_service import process_email_upload_file
from security import hash_password, check_password
from services.batch_manager import bm
from utils.cloud import upload_excel_to_supabase
from settings import settings
from sqlalchemy.orm import selectinload
from sqlalchemy import select

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _get_admin_secret() -> str:
    secret = settings.admin_secret
    if not secret:
        logger.critical("ADMIN_SECRET not configured!")
        return "NOT_CONFIGURED"
    return secret


def _check_secret(x_admin_secret: str | None) -> bool:
    return bool(x_admin_secret) and x_admin_secret == _get_admin_secret()


@router.get("/health")
async def health(x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"status": "unauthorized"}, status_code=401)
    return {"status": "ok"}


@router.get("/list-batches")
async def list_batches(x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    try:
        batches = await bm.list_batches()
    except Exception:
        logger.exception("Failed to get batches")
        return JSONResponse(content={"error": "Failed to retrieve batch list."}, status_code=500)
    return {"batches": batches}


@router.post("/generate-accounts")
async def generate_accounts(
    x_admin_secret: str | None = Header(None),
    mode: str = Query("missing"),
    batch_year: int = Query(2022),
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    if mode.lower() not in {"missing", "all"}:
        return JSONResponse(content={"error": "Invalid mode. Use 'missing' or 'all'."}, status_code=400)

    from services.admin_service import generate_accounts_csv
    import asyncio
    csv_bytes, filename = await asyncio.get_event_loop().run_in_executor(
        None, generate_accounts_csv, mode, batch_year
    )

    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/upload-emails")
async def upload_emails(
    file: UploadFile = File(...),
    x_admin_secret: str | None = Header(None),
    batch_year: int = Query(2022),
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    filename = file.filename or ""
    if not filename:
        return JSONResponse(content={"error": "Invalid filename"}, status_code=400)

    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".xlsx", ".csv"}:
        return JSONResponse(content={"error": "Only .xlsx or .csv allowed"}, status_code=400)

    # Save uploaded file to a temp file
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmpfile:
        content = await file.read()
        tmpfile.write(content)
        tmpfile.flush()
        temp_upload_path = tmpfile.name

    try:
        import asyncio
        from security import hash_password as _hp

        # process_email_upload_file is sync — run in executor
        result, status_code = await asyncio.get_event_loop().run_in_executor(
            None,
            process_email_upload_file,
            temp_upload_path,
            ext,
            batch_year,
            bm.session_scope,
            _hp,
            StudentAuth,
            ParentAuth,
            selectinload,
        )
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return JSONResponse(content={"error": "Internal server error"}, status_code=500)
    finally:
        try:
            os.remove(temp_upload_path)
        except Exception as e:
            logger.debug(f"Temp file cleanup failed: {e}")

    return JSONResponse(content=result, status_code=status_code)


@router.post("/upload-mentors")
async def upload_mentors(
    file: UploadFile = File(...),
    x_admin_secret: str | None = Header(None),
    batch_year: int | None = Query(None),
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    if not batch_year:
        return JSONResponse(content={"error": "batch_year query param required"}, status_code=400)

    filename = file.filename or ""
    if not filename.endswith(".xlsx"):
        return JSONResponse(content={"error": "Only .xlsx allowed"}, status_code=400)

    from services.admin_service import (
        process_mentor_upload_file,
        _unique_teacher_username,
        _safe_seed,
    )

    try:
        import asyncio
        from security import hash_password as _hp

        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
            content = await file.read()
            tmpfile.write(content)
            tmpfile.flush()
            temp_path = tmpfile.name

        response, status_code = await asyncio.get_event_loop().run_in_executor(
            None,
            process_mentor_upload_file,
            temp_path,
            batch_year,
            bm.session_scope,
            _hp,
            Mentor,
            Teacher,
            StudentAuth,
            _unique_teacher_username,
            _safe_seed,
            upload_excel_to_supabase,
        )
        os.remove(temp_path)
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return JSONResponse(content={"error": "Internal server error"}, status_code=500)

    return JSONResponse(content=response, status_code=status_code)


@router.get("/download-teachers-csv")
async def download_teachers_csv(
    x_admin_secret: str | None = Header(None),
    batch_year: int = Query(0),
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    async with bm.session_scope(batch_year) as session:
        result = await session.execute(
            select(ExportCache).where(ExportCache.batch_year == batch_year)
        )
        cache_entry = result.scalars().first()

        if not cache_entry:
            return JSONResponse(
                content={"error": "No CSV available, please re-upload mentors"},
                status_code=404,
            )

        csv_content = cache_entry.csv_content

        def _get_encryption_cipher():
            secret = settings.secret_key.encode("utf-8")
            key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
            return Fernet(key)

        cipher = _get_encryption_cipher()
        try:
            csv_content = cipher.decrypt(csv_content.encode("utf-8")).decode("utf-8")
        except Exception:
            pass  # Fallback if old plain-text CSV exists

    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="generated_teachers_batch_{batch_year}.csv"'
        },
    )


@router.post("/create-batch")
async def create_batch(request: Request, x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    data = await request.json()
    batch_year = data.get("batch_year")
    if not batch_year:
        return JSONResponse(content={"error": "Missing batch_year"}, status_code=400)
    batch_year = int(batch_year)

    batches = await bm.list_batches()
    if batch_year in batches:
        return JSONResponse(
            content={"error": f"Batch {batch_year} already exists"}, status_code=400
        )

    try:
        await bm.create_batch(batch_year)
        return {"status": "success", "batch_year": batch_year}
    except Exception:
        logger.exception("Failed to create batch")
        return JSONResponse(content={"error": "Failed to create batch."}, status_code=500)


@router.post("/refresh-batch")
async def refresh_batch(request: Request, x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    data = await request.json()
    batch_year = data.get("batch_year")
    if not batch_year:
        return JSONResponse(content={"error": "Missing batch_year"}, status_code=400)
    batch_year = int(batch_year)

    try:
        await bm.refresh_batch_data(batch_year)
        return {"status": "success", "batch_year": batch_year}
    except Exception:
        logger.exception("Failed to refresh batch")
        return JSONResponse(content={"error": "Failed to refresh batch data."}, status_code=500)
