from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from utils.helpers import get_batch_year_from_request
from services.student_analysis_service import analyze_student_performance
from cache_config import cache
import asyncio

router = APIRouter(tags=["student_analysis"])


@router.get("/auth/Student/analysis")
@cache(expire=3600)
async def get_student_analysis(
    request: Request,
    usn: str = Query(None),
    semester: str = Query(None),
):
    batch_year = get_batch_year_from_request(request)

    if not usn or not semester:
        return JSONResponse(content={"error": "USN and semester are required"}, status_code=400)

    try:
        analysis = await asyncio.get_event_loop().run_in_executor(
            None, analyze_student_performance, usn, semester, batch_year
        )

        analysis.pop("study_tips", None)

        if "study_summary" not in analysis:
            analysis["study_summary"] = "Focus on overall improvement."

        return analysis
    except Exception:
        return JSONResponse(content={"error": "Failed to perform student analysis."}, status_code=500)
