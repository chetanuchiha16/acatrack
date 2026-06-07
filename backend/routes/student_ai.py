import asyncio
import contextvars
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

router = APIRouter(prefix="/ai", tags=["ai"])


async def run_in_executor(func, *args):
    ctx = contextvars.copy_context()
    return await asyncio.get_event_loop().run_in_executor(None, ctx.run, func, *args)


@router.get("/summary")
@cache(expire=3600)
async def ai_summary(req: Request, usn: str = Query(""), lng: str = Query("en")):
    by = get_batch_year_from_request(req)
    data, code = await run_in_executor(get_ai_summary_data, usn, lng, by)
    if code != 200:
        return JSONResponse(content=data, status_code=code)
    return data


@router.get("/trend")
@cache(expire=3600)
async def ai_trend(req: Request, usn: str = Query("")):
    by = get_batch_year_from_request(req)
    data, code = await run_in_executor(get_ai_trend_data, usn, by)
    if code != 200:
        return JSONResponse(content=data, status_code=code)
    return data


@router.get("/predict_cgpa")
@cache(expire=3600)
async def ai_predict_cgpa(req: Request, usn: str = Query("")):
    by = get_batch_year_from_request(req)
    data, code = await run_in_executor(get_ai_cgpa_prediction, usn, by)
    if code != 200:
        return JSONResponse(content=data, status_code=code)
    return data


@router.get("/profile")
@cache(expire=3600)
async def ai_profile(req: Request, usn: str = Query(""), lng: str = Query("en")):
    by = get_batch_year_from_request(req)
    data, code = await run_in_executor(get_ai_profile_data, usn, lng, by)
    if code != 200:
        return JSONResponse(content=data, status_code=code)
    return data
