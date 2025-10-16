from models.student import Student
from sqlalchemy import create_engine
if __name__ == "__main__":
    # For batch 2024 data in Postgres
    try:
        engine = create_engine("postgresql+psycopg2://chetan:chetan@localhost:5433/Group_Project")
        student = Student("1JS22CS001", "SEM3", 2022, engine=engine)
        print(student.name)
        print(student.subject_names)
    except ValueError as e:
        print(e)
