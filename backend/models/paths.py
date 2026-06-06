from pathlib import Path
from settings import settings
from logger_config import get_logger
from utils.cloud import download_image_from_url

logger = get_logger(__name__)
base_dir = Path(__file__).resolve().parent.parent
excel_path = str(base_dir / "Inputs/ExcelSheet/result list project.xlsx")
email_excel_path = str(base_dir / "Inputs/ExcelSheet/Email.xlsx")
mentor_excel_path = str(base_dir / "Inputs/ExcelSheet/Mentor.xlsx")
logo_url = settings.logo_url

_cached_logo_path = None


def get_logo_path():
    global _cached_logo_path
    if not _cached_logo_path:
        _cached_logo_path = download_image_from_url(logo_url)
    return _cached_logo_path


pdf_dir = str(base_dir / "Outputs" / "PDFs")
notes_dir = str(base_dir / "Outputs" / "NOTES")
img_dir = str(base_dir / "Outputs" / "Images")

excel_dir = base_dir / "Inputs" / "ExcelSheet"


def get_excel_path(batch_year: int) -> str:
    return str(excel_dir / f"result_list_{batch_year}.xlsx")


postgres_db_url = settings.database_url
API_BASE = "http://localhost:5000"
