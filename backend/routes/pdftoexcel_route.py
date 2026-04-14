import uuid
from fastapi import APIRouter, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from services.batch_manager import bm
from models.schema import Job
from utils.helpers import get_batch_year_from_request
from logger_config import get_logger
from sqlalchemy import select
import tempfile
import asyncio

logger = get_logger(__name__)

router = APIRouter(prefix="/pdftoexcel", tags=["pdf_to_excel"])


@router.post("/upload")
async def upload_archive(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    batch_year = get_batch_year_from_request(request)

    filename = file.filename or ""
    if not filename.endswith((".zip", ".rar", ".tar.gz")):
        return JSONResponse(content={"error": "Only .zip, .rar, .tar.gz allowed"}, status_code=400)

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        temp_path = tmp.name

    job_id = str(uuid.uuid4())

    async with bm.session_scope(batch_year) as session:
        job = Job(id=job_id, status="queued", progress=0)
        session.add(job)
        await session.commit()

    from services.pdf_service import process_archive
    background_tasks.add_task(process_archive, job_id, temp_path, batch_year)

    return {"job_id": job_id, "status": "queued"}


@router.get("/status/{job_id}")
async def get_status(job_id: str, request: Request):
    batch_year = get_batch_year_from_request(request)

    async with bm.session_scope(batch_year) as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalars().first()

        if not job:
            return JSONResponse(content={"error": "Job not found"}, status_code=404)

        return {
            "id": job.id,
            "status": job.status,
            "progress": job.progress,
            "processed_files": job.processed_files,
            "excel_url": job.excel_url,
            "error": job.error,
        }
