# test_university_postgres.py

import pandas as pd
from models import University, Student

def test_university_postgres():
    # Replace with your actual Postgres URL and batch year
    postgres_url = "postgresql+psycopg2://chetan:chetan@localhost:5433/Group_Project"
    batch_year = 2022

    # Create University instance
    uni = University(postgres_url=postgres_url, batch_year=batch_year)

    print("Fetching semester tables...")
    semesters = uni.fetch_semester_tables()
    print("Semester tables found:", semesters)

    if not semesters:
        print("No semester tables found. Exiting test.")
        return

    # Test adding students
    selected_semester = f"SEM1"  # Replace with a semester present in your database
    print(f"\nAdding students for {selected_semester}...")
    uni.add_students(selected_semester)
    print(f"Total students added: {len(uni.students)}")

    # Test academic performance calculation
    print(f"\nCalculating academic performance for {selected_semester}...")
    results = uni.calculate_academic_performance_by_semester(selected_semester)
    print(f"Results for {selected_semester}:")
    for student in results[:3]:  # Print first 3 for brevity
        print(student)

    # Test fetching failed students
    print(f"\nFetching failed students for {selected_semester}...")
    failed_students = uni.find_failed_students(selected_semester)
    print(f"Number of failed students: {len(failed_students)}")
    for fs in failed_students[:3]:  # Print first 3 for brevity
        print(fs)

    # Optional: Test plotting (will save plot)
    print(f"\nPlotting student totals for {selected_semester}...")
    fig, path = uni.plot_student_totals(selected_semester, mode='top_n', n=5)
    print(f"Plot saved to: {path}")

if __name__ == "__main__":
    test_university_postgres()
