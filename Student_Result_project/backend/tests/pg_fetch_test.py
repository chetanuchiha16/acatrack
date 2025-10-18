from models.fetch import fetch_student_data, create_engine
from models.paths import postgres_db_url
if __name__ == "__main__":
    engine = create_engine(postgres_db_url)
    result = fetch_student_data("1JS22CS006", "SEM3", 2022, engine=engine)
    if result:
        print(result["name"], result["subject_code"], result["ia_marks"])
    else:
        print("Student not found")
