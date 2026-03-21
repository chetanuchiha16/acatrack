from pathlib import Path
from settings import settings
from logger_config import get_logger
from utils.cloud import download_image_from_url

logger = get_logger(__name__)
base_dir = Path(__file__).resolve().parent.parent
# logger.debug("../Inputs")
excel_path = str(base_dir / "Inputs/ExcelSheet/result list project.xlsx")
email_excel_path = str(base_dir / "Inputs/ExcelSheet/Email.xlsx")
mentor_excel_path = str(base_dir / "Inputs/ExcelSheet/Mentor.xlsx")
# logo_path = str(base_dir / "Inputs" / "Images" / "logo.png")
# Your Supabase public URL
logo_url = "https://hpavqkjevepfegkojisn.supabase.co/storage/v1/object/public/uploads/Inputs/Images/logo.png"

# Download and get a local file path lazily
_cached_logo_path = None


def get_logo_path():
    global _cached_logo_path
    if not _cached_logo_path:
        _cached_logo_path = download_image_from_url(logo_url)
    return _cached_logo_path


# db_path = str(base_dir / "Outputs" / "student_data.db")
# db_path = str(base_dir / "instance" / "user.db")
pdf_dir = str(base_dir / "Outputs" / "PDFs")
notes_dir = str(base_dir / "Outputs" / "NOTES")
img_dir = str(base_dir / "Outputs" / "Images")

excel_dir = base_dir / "Inputs" / "ExcelSheet"


def get_excel_path(batch_year: int) -> str:
    return str(excel_dir / f"result_list_{batch_year}.xlsx")


postgres_db_url = settings.database_url
API_BASE = "http://localhost:5000"
# from services.batch_manager import BatchManager

# current_batch_db_path = None

# def set_current_batch_db(batch_year: int):
#     global current_batch_db_path
#     current_batch_db_path = BatchManager().get_db_path(batch_year)

# def get_current_db_path():
#     logger.debug(current_batch_db_path)
#     return current_batch_db_path

# logger.debug(excel_path)
# logger.debug(logo_path)
# logger.debug(base_dir)
# logger.debug(f"[DEBUG] Using DB path: {base_dir}")
# logger.debug(f"[DEBUG] Exists? {Path(excel_path).exists()}")
