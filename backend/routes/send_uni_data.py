from fastapi import APIRouter, Query, Cookie, Request
from fastapi.responses import JSONResponse, Response
from cache_config import cache
from services.university_service import University
from visuals import create_toppers_list_pdf, create_university_report_async
from logger_config import get_logger
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
    semester: str | None = Query(None),
    show_toppers: bool = Query(False),
    show_failed: bool = Query(False),
    format: str = Query("json"),
    batch_year: int | None = Query(None),
    section: str | None = Query(None),
    access_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    by = batch_year
    if not by and access_token:
        from utils.helpers import decode_jwt

        payload = decode_jwt(access_token)
        by = payload.get("batch_year") if payload else None

    from utils.helpers import verify_teacher_section_access
    await verify_teacher_section_access(db, request, section, by)

    try:
        university = University(session=db, batch_year=by)
        result = await university.calculate_academic_performance_async(
            db, semester, section
        )

        if show_toppers:
            toppers = sorted(result, key=lambda x: x["percentage"], reverse=True)[:10]
            if format == "pdf":
                pdf_bytes = await asyncio.get_event_loop().run_in_executor(
                    None, create_toppers_list_pdf, toppers, semester
                )

                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'attachment; filename="{semester}_toppers_list.pdf"'
                    },
                )
            return toppers

        elif show_failed:
            failed_students = await university.find_failed_students_async(
                db, semester, section_name=section
            )
            return failed_students
        else:
            return result
    except Exception:
        logger.exception("Error in fetching academic performance")
        return JSONResponse(
            content={"error": "Failed to fetch academic performance data."},
            status_code=500,
        )


@router.get("/auth/Staff/report/{semester}")
@cache(expire=3600)
async def get_report(
    semester: str,
    request: Request,
    batch_year: int | None = Query(None),
    section: str | None = Query(None),
    access_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    by = batch_year
    if not by and access_token:
        from utils.helpers import decode_jwt

        payload = decode_jwt(access_token)
        by = payload.get("batch_year") if payload else None

    from utils.helpers import verify_teacher_section_access
    await verify_teacher_section_access(db, request, section, by)

    university = University(session=db, batch_year=by)
    pdf_bytes = await create_university_report_async(
        university, semester, db, section_name=section
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{semester}_report.pdf"'
        },
    )

