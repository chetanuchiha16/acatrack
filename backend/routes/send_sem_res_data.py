from io import BytesIO

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from cache_config import cache
from services.results_service import SubjectResult
from services.university_service import University
from services.fetch_service import sem_subjects
from utils.helpers import get_batch_year_from_request
from models.paths import postgres_db_url
from visuals import generate_sem_pdf
from logger_config import get_logger
import asyncio

logger = get_logger(__name__)

router = APIRouter(tags=["semester_results"])


@router.get("/auth/Staff/sem_res")
@cache(expire=3600)
async def get_semester_results(
    request: Request,
    semester: str = Query(None),
    batch_year: int | None = Query(None),
):
    by = batch_year or get_batch_year_from_request(request)
    if not semester:
        return JSONResponse(content={"error": "Missing semester parameter"}, status_code=400)

    try:
        semester_subject_mapping = {
            "sem1": ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BPLCK105B", "BESCK104C", "BESCK104A", "BETCK105H"],
            "sem2": ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BKBKK207", "BSFHK258", "BPLCK205B", "BESCK204C", "BESCK204D", "BETCK205H"],
            "sem3": ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
            "sem4": ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B", "BCSL456D"],
        }

        subjects = semester_subject_mapping.get(semester, [])
        if not subjects:
            return JSONResponse(content={"error": "No subjects found for the selected semester"}, status_code=404)

        def _sync():
            university = University(postgres_url=postgres_db_url, batch_year=by)
            students = university.get_students_for_semester(selected_semester=semester)
            if not students:
                return None
            results = []
            for subject_code in subjects:
                subject_result = SubjectResult(subject_code, semester, university, students=students)
                if subject_result.total_students == 0 and subject_result.present_students == 0:
                    continue
                results.append({
                    "subject_name": sem_subjects[semester].get(subject_code, "Unknown subject"),
                    "subject_code": subject_code,
                    "total_students": subject_result.total_students,
                    "present_students": subject_result.present_students,
                    "absent_students": subject_result.absent_students,
                    "pass_percentage": round(subject_result.pass_percentage, 2),
                    "fcd_count": subject_result.fcd_count,
                    "fc_count": subject_result.fc_count,
                    "sc_count": subject_result.sc_count,
                    "fail_count": subject_result.fail_count,
                })
            return results

        results = await asyncio.get_event_loop().run_in_executor(None, _sync)

        if results is None:
            return JSONResponse(content={"error": f"No data found for {semester} in batch {by}"}, status_code=404)

        return {"semester": semester, "results": results}

    except Exception:
        logger.exception("Error in get_semester_results")
        return JSONResponse(content={"error": "Failed to fetch semester results."}, status_code=500)


@router.get("/auth/Staff/sem_res/report/{semester}")
@cache(expire=3600)
async def download_semester_report(semester: str, request: Request, batch_year: int | None = Query(None)):
    by = batch_year or get_batch_year_from_request(request)
    semester_subject_mapping = {
        "sem1": ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BPLCK105B", "BESCK104C", "BESCK104A", "BETCK105H"],
        "sem2": ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BKBKK207", "BSFHK258", "BPLCK205B", "BESCK204C", "BESCK204D", "BETCK205H"],
        "sem3": ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
        "sem4": ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B", "BCSL456D"],
    }

    def _sync():
        university = University(postgres_url=postgres_db_url, batch_year=by)
        return generate_sem_pdf(semester, university, semester_subject_mapping)

    pdf_bytes = await asyncio.get_event_loop().run_in_executor(None, _sync)
    pdf_buffer = BytesIO(pdf_bytes)
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{semester}_results.pdf"'},
    )
