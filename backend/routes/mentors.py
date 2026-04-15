from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, FileResponse
from logger_config import get_logger
from utils.helpers import get_batch_year_from_request
from models.paths import pdf_dir
from services.mentor_service import (
    get_mentor_students_data,
    generate_mentee_chart_base64,
)
from pathlib import Path
import os

logger = get_logger(__name__)

router = APIRouter(tags=["mentors"])


@router.get("/auth/Staff/Mentor/result")
async def get_mentor_students(
    request: Request,
    mentor_id: int = Query(None),
    semester: str = Query(None),
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)

    import asyncio

    results, status_code, error_msg = await asyncio.get_event_loop().run_in_executor(
        None, get_mentor_students_data, mentor_id, semester, by
    )

    if error_msg:
        return JSONResponse(content={"error": error_msg}, status_code=status_code)

    return results


@router.get("/auth/Staff/Mentor/report/{filename}")
async def download_mentee_report(filename: str):
    safe_filename = Path(filename).name
    filepath = os.path.join(pdf_dir, safe_filename)
    if not os.path.exists(filepath):
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    return FileResponse(filepath, filename=safe_filename, media_type="application/pdf")


@router.get("/auth/Staff/Mentor/chart")
async def get_mentee_chart(
    request: Request,
    usn: str = Query(None),
    semester: str = Query(None),
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)

    import asyncio

    image_url, status_code, error_msg = await asyncio.get_event_loop().run_in_executor(
        None, generate_mentee_chart_base64, usn, semester, by
    )

    if error_msg:
        return JSONResponse(content={"error": error_msg}, status_code=status_code)

    return {"image": image_url}
