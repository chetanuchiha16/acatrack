from models.fetch import fetch_student_data, create_engine
from models.paths import postgres_db_url
from logger_config import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    engine = create_engine(postgres_db_url)
    result = fetch_student_data("1JS22CS006", "sem3", 2022, engine=engine)
    if result:
        logger.debug(result["name"], result["subject_code"], result["ia_marks"])
    else:
        logger.debug("Student not found")
