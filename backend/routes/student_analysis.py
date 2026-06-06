from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from utils.helpers import get_batch_year_from_request
from services.student_analysis_service import analyze_student_performance
from services.batch_manager import bm
from cache_config import cache

router = APIRouter(tags=["student_analysis"])


@router.get("/auth/Student/analysis")
@cache(expire=3600)
async def get_student_analysis(
    req: Request,
    student_usn: str = Query(None, alias="usn"),
    target_sem: str = Query(None, alias="semester"),
):
    """
    Retrieves performance analysis for a specific student and semester.
    """
    by = get_batch_year_from_request(req)

    if not student_usn or not target_sem:
        return JSONResponse(
            content={"error": "Both usn and semester queries must be provided."},
            status_code=400,
        )

    try:
        async with bm.session_scope(by) as session:
            perf_data = await analyze_student_performance(
                session, student_usn, target_sem, by
            )

        # Sanitize output by removing raw tips and ensuring default summary exists
        if "study_tips" in perf_data:
            del perf_data["study_tips"]

        if not perf_data.get("study_summary"):
            perf_data["study_summary"] = "Focus on overall improvement."

        return perf_data

    except Exception:
        return JSONResponse(
            content={"error": "An error occurred during performance analysis calculation."},
            status_code=500,
        )
