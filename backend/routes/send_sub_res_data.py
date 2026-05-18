from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, Response
from cache_config import cache
from services.university_service import University
from services.results_service import SubjectResult
from visuals import create_subject_report
from utils.helpers import get_batch_year_from_request
from logger_config import get_logger
import asyncio

logger = get_logger(__name__)

router = APIRouter(tags=["subject_results"])


@router.get("/auth/Staff/sub_res")
@cache(expire=3600)
async def get_subject_results(
    request: Request,
    semester: str = Query(None),
    subject: str = Query(None),
    batch_year: int | None = Query(None),
    section: str = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)
    if not semester or not subject:
        return JSONResponse(
            content={"error": "semester and subject are required"}, status_code=400
        )

    def _sync():
        university = University(batch_year=by)
        subject_result = SubjectResult(
            subject, semester, university, section_name=section
        )
        return subject_result.get_subject_results_dict()

    result_data = await asyncio.get_event_loop().run_in_executor(None, _sync)
    return result_data


@router.get("/auth/Staff/sub_res/report")
@cache(expire=3600)
async def get_subject_report_pdf(
    request: Request,
    semester: str = Query(None),
    subject: str = Query(None),
    batch_year: int | None = Query(None),
    section: str = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)
    if not semester or not subject:
        return JSONResponse(
            content={"error": "semester and subject are required"}, status_code=400
        )

    def _sync():
        university = University(batch_year=by)
        subject_result = SubjectResult(
            subject, semester, university, section_name=section
        )
        return create_subject_report(subject_result)

    pdf_bytes = await asyncio.get_event_loop().run_in_executor(None, _sync)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="subject_report_{semester}_{subject}.pdf"'
        },
    )
