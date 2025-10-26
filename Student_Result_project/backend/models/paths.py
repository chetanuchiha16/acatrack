from pathlib import Path
import os
import dotenv
from logger_config import get_logger

logger = get_logger(__name__)

dotenv.load_dotenv()
base_dir = Path(__file__).resolve().parent.parent
# logger.debug("../Inputs")
excel_path = str(base_dir / "Inputs/ExcelSheet/result list project.xlsx")
email_excel_path = str(base_dir / "Inputs/ExcelSheet/Email.xlsx")
mentor_excel_path = str(base_dir / "Inputs/ExcelSheet/Mentor.xlsx")
logo_path = str(base_dir / "Inputs" / "Images" / "logo.png")
# db_path = str(base_dir / "Outputs" / "student_data.db")
# db_path = str(base_dir / "instance" / "user.db")
pdf_dir = str(base_dir / "Outputs" / "PDFs")
notes_dir = str(base_dir / "Outputs" / "NOTES")
img_dir = str(base_dir / "Outputs" / "Images")

excel_dir = base_dir / "Inputs" / "ExcelSheet"
db_dir = base_dir / "Outputs" / "Databases"

db_dir.mkdir(parents=True, exist_ok=True)

def get_excel_path(batch_year: int) -> str:
    return str(excel_dir / f"result_list_{batch_year}.xlsx")

def get_db_path(batch_year: int) -> str:
    logger.debug(str(db_dir / f"student_data_{batch_year}.db"))
    return str(db_dir / f"student_data_{batch_year}.db")

postgres_db_url = os.getenv("DATABASE_URL")
API_BASE="http://localhost:5000"
# from models.batch_manager import BatchManager

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

from sqlalchemy import create_engine
engine = create_engine(postgres_db_url)

try:
    with engine.connect() as connection:
        logger.debug("Connection successful!")
except Exception as e:
    logger.debug(f"Failed to connect: {e}")