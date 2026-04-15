from io import BytesIO

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from cache_config import cache
from services.university_service import University
from visuals import create_toppers_list_pdf, create_university_report_async
from models.paths import postgres_db_url
from logger_config import get_logger
from utils.helpers import get_batch_year_from_request
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
import asyncio

logger = get_logger(__name__)

router = APIRouter(tags=["university"])


@router.get("/auth/Staff/overall_res")
@cache(expire=3600)
async def get_academic_performance(
    request: Request,
    semester: str = Query(None),
    show_toppers: bool = Query(False),
    show_failed: bool = Query(False),
    format: str = Query("json"),
    batch_year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    by = batch_year or get_batch_year_from_request(request)

    try:
        university = University(session=db, batch_year=by)
        result = await university.calculate_academic_performance_async(db, semester)

        if show_toppers:
            toppers = sorted(result, key=lambda x: x["percentage"], reverse=True)[:10]
            if format == "pdf":
                pdf_bytes = await asyncio.get_event_loop().run_in_executor(
                    None, create_toppers_list_pdf, toppers, semester
                )
                pdf_buffer = BytesIO(pdf_bytes)
                pdf_buffer.seek(0)
                return StreamingResponse(
                    pdf_buffer,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{semester}_toppers_list.pdf"'},
                )
            return toppers

        elif show_failed:
            failed_students = await university.find_failed_students_async(db, semester)
            return failed_students
        else:
            return result
    except Exception:
        logger.exception("Error in fetching academic performance")
        return JSONResponse(content={"error": "Failed to fetch academic performance data."}, status_code=500)


@router.get("/auth/Staff/report/{semester}")
@cache(expire=3600)
async def get_report(semester: str, request: Request, batch_year: int | None = Query(None), db: AsyncSession = Depends(get_db)):
    by = batch_year or get_batch_year_from_request(request)

    university = University(session=db, batch_year=by)
    pdf_bytes = await create_university_report_async(university, semester, db)
    
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{semester}_report.pdf"'},
    )
