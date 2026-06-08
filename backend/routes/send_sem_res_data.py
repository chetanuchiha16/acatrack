from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, Response
from cache_config import cache
from services.university_service import University
from utils.helpers import get_batch_year_from_request
from visuals import generate_sem_pdf_async
from logger_config import get_logger
from schemas import StaffAvailableSemestersResponse
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

logger = get_logger(__name__)

router = APIRouter(tags=["semester_results"])


@router.get(
    "/auth/Staff/available_semesters", response_model=StaffAvailableSemestersResponse
)
async def get_staff_available_semesters(
    request: Request,
    batch_year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        from repositories.student_repository import StudentRepository

        repo = StudentRepository(db)
        sems = await repo.get_all_semesters_with_results()
        if not sems:
            sems = ["sem1"]
        return {"available_semesters": sems}
    except Exception:
        logger.exception("Error in get_staff_available_semesters")
        return JSONResponse(
            content={"error": "Failed to fetch available semesters"}, status_code=500
        )


@router.get("/auth/Staff/sem_res")
@cache(expire=3600)
async def get_semester_results(
    request: Request,
    semester: str = Query(None),
    batch_year: int | None = Query(None),
    section: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    by = batch_year or get_batch_year_from_request(request)
    from utils.helpers import verify_teacher_section_access

    await verify_teacher_section_access(db, request, section, by)

    if not semester:
        return JSONResponse(
            content={"error": "Missing semester parameter"}, status_code=400
        )

    try:
        from repositories.academic_repository import AcademicRepository

        repo = AcademicRepository(db)

        # FAANG-level optimization: Get ALL subject stats in ONE SQL query
        results = await repo.get_semester_summary_stats(semester, by, section)

        if not results:
            return JSONResponse(
                content={"error": f"No data found for {semester} in batch {by}"},
                status_code=404,
            )

        return {"semester": semester, "results": results}

    except Exception:
        logger.exception("Error in get_semester_results")
        return JSONResponse(
            content={"error": "Failed to fetch semester results."}, status_code=500
        )

    except Exception:
        logger.exception("Error in get_semester_results")
        return JSONResponse(
            content={"error": "Failed to fetch semester results."}, status_code=500
        )


@router.get("/auth/Staff/sem_res/report/{semester}")
@cache(expire=3600)
async def download_semester_report(
    semester: str,
    request: Request,
    batch_year: int | None = Query(None),
    section: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    by = batch_year or get_batch_year_from_request(request)
    from utils.helpers import verify_teacher_section_access

    await verify_teacher_section_access(db, request, section, by)

    university = University(session=db, batch_year=by)
    pdf_bytes = await generate_sem_pdf_async(
        semester, university, db, section_name=section
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{semester}_results.pdf"'
        },
    )
