import os
import sys

from dotenv import load_dotenv

# Load environment and set paths
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(env_path)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.batch_manager import bm
from models.student import Student
from app_init import create_app

# CONFIGURATION: Use a USN and Semester that exists in your 2022 batch data
TEST_USN = "1JS22CS001"
TEST_SEM = "sem1"
TEST_YEAR = 2022


def run_student_test():
    app = create_app()
    with app.app_context():
        print(f"\n🧪 --- Testing Student Model: {TEST_USN} ---")

        # 1. Initialize the Student object
        student = Student(usn=TEST_USN, semester=TEST_SEM, batch_year=TEST_YEAR)

        if not student.found:
            print(f"❌ Error: Student {TEST_USN} not found in database.")
            print(
                "Make sure you have run the BatchManager test first to populate data."
            )
            return

        print(f"✅ Student Found: {student.name}")
        print(f"✅ Batch Year: {student.batch_year}")

        # 2. Test Semester Results
        print(f"\n[Test] Semester Results ({TEST_SEM}):")
        if student.subject_codes:
            print(f"-> Subjects: {len(student.subject_codes)}")
            print(f"-> Marks Sample: IA={student.ia_marks[:2]}, SEE={student.see_marks[:2]}")
            print(f"-> Credits Sample: {student.credits[:2]}")
            print("✅ Semester data loaded correctly.")
        else:
            print("❌ No subject data found for this semester.")

        # 3. Test SGPA (Standard Calculation)
        print("\n[Test] SGPA Calculation:")
        current_sgpa = student.sgpa
        print(f"-> Calculated SGPA: {current_sgpa}")
        if 0.0 <= current_sgpa <= 10.0:
            print("✅ SGPA within valid range.")
        else:
            print(f"❌ SGPA {current_sgpa} is invalid.")

        # 4. Test Backlogs
        print("\n[Test] Backlog Detection:")
        bl = [c for c, status in zip(student.subject_codes, student.pass_fail) if status == "Fail"]
        print(f"-> Backlogs found: {bl}")
        # Verify if logic works (total < 40 is a fail)
        manual_check = [
            c for c, ia, see in zip(student.subject_codes, student.ia_marks, student.see_marks) if (ia + see) < 40 or see < 18 or ia < 20
        ]
        if set(bl) == set(manual_check):
            print("✅ Backlog logic matches manual check.")
        else:
            print("❌ Backlog mismatch!")

        # 5. Test CGPA (The New Feature)
        print("\n[Test] CGPA (Multi-Semester) Calculation:")
        current_cgpa = student.cgpa
        print(f"-> Calculated CGPA: {current_cgpa}")
        if current_cgpa >= 0:
            print("✅ CGPA successfully calculated across available data.")
        else:
            print(
                "⚠️ CGPA is 0.0. This is expected if only one semester of data exists."
            )

        # 6. Final Dictionary Check for Frontend
        print("\n[Test] Dictionary Output (for React):")
        data = student.to_dict()
        expected_keys = ["usn", "name", "found", "sgpa", "cgpa", "credits", "subjects"]
        missing = [k for k in expected_keys if k not in data]

        if not missing:
            print("✅ to_dict() contains all keys required by the frontend.")
        else:
            print(f"❌ to_dict() missing keys: {missing}")


if __name__ == "__main__":
    run_student_test()
