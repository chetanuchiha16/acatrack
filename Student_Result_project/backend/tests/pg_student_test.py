from models.student import Student

if __name__ == "__main__":
    # For batch 2024 data in Postgres
    try:
        student = Student("1JS22CS001", "SEM3", 2022)
        print(student.name)
        print(student.subject_names)
    except ValueError as e:
        print(e)
