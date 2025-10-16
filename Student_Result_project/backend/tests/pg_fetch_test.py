from models.fetch import fetch_student_data
if __name__ == "__main__":

    result = fetch_student_data("1JS22CS006", "SEM3", 2022)
    if result:
        print(result["name"], result["subject_code"])
    else:
        print("Student not found")
