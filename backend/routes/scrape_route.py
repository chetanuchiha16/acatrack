from fastapi import APIRouter
from logger_config import get_logger
from schemas import FetchResultsRequest

logger = get_logger(__name__)

router = APIRouter(tags=["scrape"], prefix="/webscrape")


@router.post("/fetch-results")
async def fetch_results_route(body: FetchResultsRequest):
    """
    Deprecated server-side scraping endpoint.
    All result scraping now runs on the local, high-performance Wails desktop application.
    """
    logger.warning(
        "Attempted to access deprecated server-side Selenium scraping route."
    )
    return {
        "status": "deprecated",
        "message": (
            "The server-side Selenium result crawler has been deprecated for security, speed, and CAPTCHA limits. "
            "Please use the standalone Wails-based VTU Desktop Scraper Client for high-performance batch PDF crawling."
        ),
    }
