from models.fetch import fetch_student_data
from models import Student
import sqlite3
from models.config import db_path

#temp function to print Student class  dat
def print_student_data_by_usn(usn, db_path=db_path):
    try:
        # Get list of semesters from the database (filter for tables that start with 'SEM')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        semesters = [table[0] for table in tables if table[0].startswith('SEM')]  # Filter only tables starting with "SEM"
        conn.close()

        # Check if there are any semesters to display
        if not semesters:
            print("No semester data available.")
            return

        # Loop through each semester and fetch student data
        for semester in semesters:
            # Fetch student data for the given USN and semester
            student_info = fetch_student_data(usn, semester, db_path)
            if student_info:
                # Create a Student object for the current semester
                student = Student(usn=usn, semester=semester, db_path=db_path)

                # Display the student's information for the current semester
                print(f"\nData for {semester}:")
                student.display_student_info()  # Using the display method from the Student class

            else:
                print(f"No data found for USN {usn} in {semester}.")

    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    # Usage
    usn_to_search = "1JS22CS006"  # Replace with the actual USN you want to look up
    print_student_data_by_usn(usn_to_search)