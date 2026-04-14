from services.student_service import Student
from app_init import create_app
from logger_config import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        # For batch 2024 data in Postgres
        try:
            student = Student(usn="1JS22CS001", semester="sem3", batch_year=2022)
            logger.debug(student.name)
            logger.debug(student.subject_names)
        except ValueError as e:
            logger.debug(e)
