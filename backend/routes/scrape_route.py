from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from services.scraper import fetch_usn_range
from logger_config import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["scrape"], prefix="/webscrape")


def batch_from_usn(usn_prefix: str) -> int:
    year_suffix = usn_prefix[3:5]
    return 2000 + int(year_suffix)


def get_exam_session_and_year(usn_prefix: str, sem: int):
    batch_year = batch_from_usn(usn_prefix)
    if sem % 2 == 1:  # odd sem
        exam_session = "DJ"
        exam_year = batch_year + (sem // 2) + 1
    else:
        exam_session = "JJE"
        exam_year = batch_year + (sem // 2)
    exam_year_suffix = str(exam_year)[-2:]
    return exam_session, exam_year_suffix, batch_year


@router.post("/fetch-results")
async def fetch_results_route(request: Request, background_tasks: BackgroundTasks):
    """
    Expects JSON:
    {
        "usn_prefix": "1JS23CS",
        "usn_start": 8,
        "usn_end": 25,
        "sem": 1
    }
    """
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    required_fields = ["usn_prefix", "usn_start", "usn_end", "sem"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return JSONResponse(
            {"error": f"Missing fields: {', '.join(missing)}"}, status_code=400
        )

    try:
        usn_prefix = str(data["usn_prefix"]).upper()
        start = int(data["usn_start"])
        end = int(data["usn_end"])
        sem = int(data["sem"])
    except ValueError:
        return JSONResponse({"error": "Invalid data format"}, status_code=400)

    exam_session, exam_year_suffix, batch_year = get_exam_session_and_year(
        usn_prefix, sem
    )

    pdf_folder = f"{batch_year}/{batch_year}_SEM{sem}"
    # The new scraper.fetch_usn_range takes: usn_prefix, start, end, exam_session, exam_year, download_dir
    background_tasks.add_task(
        fetch_usn_range,
        usn_prefix=usn_prefix,
        start=start,
        end=end,
        exam_session=exam_session,
        exam_year=exam_year_suffix,
        download_dir=f"Outputs/PDFs/{pdf_folder}",
    )

    return {
        "status": "started",
        "message": (
            f"Fetching results for batch {batch_year}, sem {sem} → "
            f"{exam_session}{exam_year_suffix}, "
            f"USNs {usn_prefix}{start:03d} to {usn_prefix}{end:03d}"
        ),
    }
