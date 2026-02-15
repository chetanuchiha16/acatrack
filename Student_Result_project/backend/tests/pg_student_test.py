from models.student import Student
from sqlalchemy import create_engine
from models.paths import postgres_db_url
from logger_config import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    # For batch 2024 data in Postgres
    try:
        engine = create_engine(postgres_db_url)
        student = Student("1JS22CS001", "sem3", 2022, engine=engine)
        logger.debug(student.name)
        logger.debug(student.subject_names)
    except ValueError as e:
        logger.debug(e)
