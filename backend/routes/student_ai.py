from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from cache_config import cache
from utils.helpers import get_batch_year_from_request
from services.student_ai_service import (
    get_ai_summary_data,
    get_ai_trend_data,
    get_ai_cgpa_prediction,
    get_ai_profile_data,
)
import asyncio

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/summary")
@cache(expire=3600)
async def ai_summary(request: Request, usn: str = Query(""), lng: str = Query("en")):
    batch_year = get_batch_year_from_request(request)

    result, status_code = await asyncio.get_event_loop().run_in_executor(
        None, get_ai_summary_data, usn, lng, batch_year
    )
    if status_code != 200:
        return JSONResponse(content=result, status_code=status_code)
    return result


@router.get("/trend")
@cache(expire=3600)
async def ai_trend(request: Request, usn: str = Query("")):
    batch_year = get_batch_year_from_request(request)

    result, status_code = await asyncio.get_event_loop().run_in_executor(
        None, get_ai_trend_data, usn, batch_year
    )
    if status_code != 200:
        return JSONResponse(content=result, status_code=status_code)
    return result


@router.get("/predict_cgpa")
@cache(expire=3600)
async def ai_predict_cgpa(request: Request, usn: str = Query("")):
    batch_year = get_batch_year_from_request(request)
    result, status_code = await asyncio.get_event_loop().run_in_executor(
        None, get_ai_cgpa_prediction, usn, batch_year
    )
    if status_code != 200:
        return JSONResponse(content=result, status_code=status_code)
    return result


@router.get("/profile")
@cache(expire=3600)
async def ai_profile(request: Request, usn: str = Query(""), lng: str = Query("en")):
    batch_year = get_batch_year_from_request(request)

    result, status_code = await asyncio.get_event_loop().run_in_executor(
        None, get_ai_profile_data, usn, lng, batch_year
    )
    if status_code != 200:
        return JSONResponse(content=result, status_code=status_code)
    return result
