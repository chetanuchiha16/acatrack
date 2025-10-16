from models.student import Student
from sqlalchemy import create_engine
from models.paths import postgres_db_url
if __name__ == "__main__":
    # For batch 2024 data in Postgres
    try:
        engine = create_engine(postgres_db_url)
        student = Student("1JS22CS001", "SEM3", 2022, engine=engine)
        print(student.name)
        print(student.subject_names)
    except ValueError as e:
        print(e)
