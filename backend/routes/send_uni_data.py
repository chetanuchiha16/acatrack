from io import BytesIO

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from cache_config import cache
from services.university_service import University
from visuals import create_toppers_list_pdf, create_university_report
from models.paths import postgres_db_url
from logger_config import get_logger
from utils.helpers import get_batch_year_from_request
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
):
    by = batch_year or get_batch_year_from_request(request)

    try:
        def _sync():
            university = University(postgres_url=postgres_db_url, batch_year=by)
            result = university.calculate_academic_performance_by_semester(semester)
            return university, result

        university, result = await asyncio.get_event_loop().run_in_executor(None, _sync)

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
            def _get_failed():
                return university.find_failed_students(semester)
            failed_students = await asyncio.get_event_loop().run_in_executor(None, _get_failed)
            return failed_students
        else:
            return result
    except Exception:
        logger.exception("Error in fetching academic performance")
        return JSONResponse(content={"error": "Failed to fetch academic performance data."}, status_code=500)


@router.get("/auth/Staff/report/{semester}")
@cache(expire=3600)
async def get_report(semester: str, request: Request, batch_year: int | None = Query(None)):
    by = batch_year or get_batch_year_from_request(request)

    def _sync():
        university = University(postgres_url=postgres_db_url, batch_year=by)
        return create_university_report(university, semester)

    pdf_bytes = await asyncio.get_event_loop().run_in_executor(None, _sync)
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{semester}_report.pdf"'},
    )
