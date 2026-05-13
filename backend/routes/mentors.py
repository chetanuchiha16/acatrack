from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import List
from schemas import StudentResultResponse, ChartResponse
from cache_config import cache
from logger_config import get_logger
from utils.helpers import get_batch_year_from_request
from models.paths import pdf_dir
from services.mentor_service import (
    get_mentor_students_data,
    generate_mentee_chart_base64,
)
from services.batch_manager import bm
from pathlib import Path
import os

logger = get_logger(__name__)

router = APIRouter(tags=["mentors"])


@router.get("/auth/Staff/Mentor/result", response_model=List[StudentResultResponse])
@cache(expire=3600)
async def get_mentor_students(
    request: Request,
    mentor_id: int = Query(None),
    semester: str = Query(None),
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)

    async with bm.session_scope(by) as session:
        results, status_code, error_msg = await get_mentor_students_data(
            session, mentor_id, semester, by
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


@router.get("/auth/Staff/Mentor/chart", response_model=ChartResponse)
@cache(expire=3600)
async def get_mentee_chart(
    request: Request,
    usn: str = Query(None),
    semester: str = Query(None),
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)

    async with bm.session_scope(by) as session:
        image_url, status_code, error_msg = await generate_mentee_chart_base64(
            session, usn, semester, by
        )

    if error_msg:
        return JSONResponse(content={"error": error_msg}, status_code=status_code)

    return {"image": image_url}
