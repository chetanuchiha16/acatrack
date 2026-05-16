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

from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, Header, Query, Body, Depends, Request, Cookie
from utils.helpers import decode_jwt
from fastapi.responses import JSONResponse, StreamingResponse
from logger_config import get_logger
from models import Mentor, ParentAuth, StudentAuth, Teacher
from models.schema import ExportCache
from services.admin_service import (
    process_email_upload_file, 
    get_all_staff, 
    register_staff_single, 
    process_staff_bulk_upload
)
from services.batch_manager import bm
from services.academic_service import AcademicService
from utils.cloud import upload_excel_to_supabase
from settings import settings
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from schemas import BatchRequest
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

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
        return JSONResponse(
            content={"error": "Failed to retrieve batch list."}, status_code=500
        )
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
        return JSONResponse(
            content={"error": "Invalid mode. Use 'missing' or 'all'."}, status_code=400
        )

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
        return JSONResponse(
            content={"error": "Only .xlsx or .csv allowed"}, status_code=400
        )

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


@router.get("/list-staff")
async def list_staff(x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    return get_all_staff()


@router.post("/register-staff")
async def register_staff(
    name: str = Query(...),
    email: str = Query(...),
    x_admin_secret: str | None = Header(None)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    from security import hash_password as _hp
    result, code = register_staff_single(name, email, _hp)
    return JSONResponse(content=result, status_code=code)


@router.post("/upload-staff-list")
async def upload_staff_list(
    file: UploadFile = File(...),
    x_admin_secret: str | None = Header(None)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    filename = file.filename or ""
    if not filename.endswith(".xlsx"):
        return JSONResponse(content={"error": "Only .xlsx allowed"}, status_code=400)
    
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
        content = await file.read()
        tmpfile.write(content)
        tmpfile.flush()
        temp_path = tmpfile.name
    
    try:
        import asyncio
        from security import hash_password as _hp
        result, code = await asyncio.get_event_loop().run_in_executor(
            None, process_staff_bulk_upload, temp_path, _hp
        )
        return JSONResponse(content=result, status_code=code)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


@router.post("/upload-mentors")
async def upload_mentors(
    file: UploadFile = File(...),
    x_admin_secret: str | None = Header(None),
    batch_year: int | None = Query(None),
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    if not batch_year:
        return JSONResponse(
            content={"error": "batch_year query param required"}, status_code=400
        )

    filename = file.filename or ""
    if not filename.endswith(".xlsx"):
        return JSONResponse(content={"error": "Only .xlsx allowed"}, status_code=400)

    from services.admin_service import process_mentor_upload_file

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
            None, # _unique_teacher_username no longer used
            None, # _safe_seed no longer used
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
async def create_batch(body: BatchRequest, x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    batch_year = body.batch_year
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
        return JSONResponse(
            content={"error": "Failed to create batch."}, status_code=500
        )


@router.post("/refresh-batch")
async def refresh_batch(body: BatchRequest, x_admin_secret: str | None = Header(None)):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    batch_year = body.batch_year
    try:
        await bm.refresh_batch_data(batch_year)
        return {"status": "success", "batch_year": batch_year}
    except Exception:
        logger.exception("Failed to refresh batch")
        return JSONResponse(
            content={"error": "Failed to refresh batch data."}, status_code=500
        )
@router.get("/my-assignments")
async def get_my_assignments(
    batch_year: int = Query(...),
    access_token: str | None = Cookie(None)
):
    from models.schema import SubjectAssignment
    from sqlalchemy.orm import selectinload

    if not access_token:
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    payload = decode_jwt(access_token)
    if not payload or payload.get("who") != "Staff":
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    username = payload.get("id")  # For teachers, id is the username

    async with bm.session_scope(batch_year) as session:
        stmt = (
            select(SubjectAssignment)
            .where(
                SubjectAssignment.teacher_username == username,
                SubjectAssignment.batch_year == batch_year,
            )
            .options(selectinload(SubjectAssignment.subject))
        )

        result = await session.execute(stmt)
        assignments = result.scalars().all()

        return {
            "assignments": [
                {
                    "subject_code": a.subject_code,
                    "subject_name": a.subject.subject_name,
                    "section_id": a.section_id,
                    "semester": a.semester,
                }
                for a in assignments
            ]
        }

# --- Academic Setup Workspace Endpoints ---

@router.post("/init-batch")
async def init_batch(
    batch_year: int = Query(...),
    sections: List[str] = Query(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    await AcademicService.initialize_batch(db, batch_year, sections)
    return {"status": "success", "message": f"Batch {batch_year} initialized with sections {sections}"}

@router.post("/register-subjects")
async def register_subjects(
    semester: str = Query(...),
    subjects: List[Dict] = Body(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    await AcademicService.register_subjects(db, semester, subjects)
    return {"status": "success", "message": f"Subjects registered for {semester}"}

@router.post("/enroll-students")
async def enroll_students(
    batch_year: int = Query(...),
    section_name: str = Query(...),
    students: List[Dict] = Body(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    try:
        await AcademicService.enroll_students(db, batch_year, section_name, students)
        return {"status": "success", "message": f"Enrolled {len(students)} students in {section_name}"}
    except ValueError as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)


@router.post("/upload-subjects-excel")
async def upload_subjects_excel(
    file: UploadFile = File(...),
    semester: str = Query(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    filename = file.filename or ""
    if not filename.endswith(".xlsx"):
        return JSONResponse(content={"error": "Only .xlsx allowed"}, status_code=400)

    import tempfile, os, asyncio
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
        content = await file.read()
        tmpfile.write(content)
        tmpfile.flush()
        temp_upload_path = tmpfile.name

    from services.admin_service import process_subject_upload_file
    try:
        results, status_code = await asyncio.get_event_loop().run_in_executor(
            None,
            process_subject_upload_file,
            temp_upload_path,
        )
        if status_code == 200:
            inserted, updated = await AcademicService.bulk_upsert_subjects(db, semester, results)
            return JSONResponse(content={"status": "success", "inserted": inserted, "updated": updated}, status_code=200)
        else:
            return JSONResponse(content=results, status_code=status_code)
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return JSONResponse(content={"error": "Internal server error"}, status_code=500)
    finally:
        if os.path.exists(temp_upload_path):
            os.remove(temp_upload_path)


@router.post("/upload-students-excel")
async def upload_students_excel(
    file: UploadFile = File(...),
    batch_year: int = Query(...),
    section_name: str = Query(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)

    filename = file.filename or ""
    if not filename.endswith(".xlsx"):
        return JSONResponse(content={"error": "Only .xlsx allowed"}, status_code=400)

    import tempfile, os, asyncio
    from security import hash_password as _hp
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmpfile:
        content = await file.read()
        tmpfile.write(content)
        tmpfile.flush()
        temp_upload_path = tmpfile.name

    from services.admin_service import process_student_enrollment_upload_file
    try:
        results, status_code = await asyncio.get_event_loop().run_in_executor(
            None,
            process_student_enrollment_upload_file,
            temp_upload_path,
        )
        if status_code == 200:
            inserted, updated = await AcademicService.bulk_upsert_students(db, batch_year, section_name, results, _hp)
            return JSONResponse(content={"status": "success", "inserted": inserted, "updated": updated}, status_code=200)
        else:
            return JSONResponse(content=results, status_code=status_code)
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return JSONResponse(content={"error": "Internal server error"}, status_code=500)
    finally:
        if os.path.exists(temp_upload_path):
            os.remove(temp_upload_path)

@router.post("/assign-subjects")
async def assign_subjects(
    teacher_username: str = Query(...),
    subject_code: str = Query(...),
    section_id: int = Query(...),
    semester: str = Query(...),
    batch_year: int = Query(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    try:
        await AcademicService.assign_subject_to_teacher(db, teacher_username, subject_code, section_id, semester, batch_year)
        return {"status": "success", "message": "Subject assigned to teacher"}
    except ValueError as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)

@router.get("/list-subjects")
async def list_subjects(
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    subjects = await AcademicService.get_all_subjects(db)
    
    return [
        {
            "subject_code": s.subject_code,
            "subject_name": s.subject_name,
            "semester": s.semester,
            "credits": s.credits
        }
        for s in subjects
    ]

@router.get("/list-sections")
async def list_sections(
    batch_year: int = Query(...),
    x_admin_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not _check_secret(x_admin_secret):
        return JSONResponse(content={"error": "Unauthorized"}, status_code=401)
    
    sections = await AcademicService.get_sections_by_batch(db, batch_year)
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "batch_year": s.batch_year
        }
        for s in sections
    ]
