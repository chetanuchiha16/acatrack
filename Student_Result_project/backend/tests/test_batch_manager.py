import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Ensure the backend directory is in the path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.batch_manager import bm
from models.schema import AcademicResult, StudentAuth, Subject
from app_init import create_app

TEST_BATCH_YEAR = 2022  # <-- Change this to an actual year you have an Excel sheet for


def run_tests():
    app = create_app()

    with app.app_context():
        print(f"\n🚀 --- Starting BatchManager Tests for Batch {TEST_BATCH_YEAR} ---")

        # TEST 1: Batch Creation and Data Prep
        print("\n[Test 1] Testing bm.create_batch()...")
        try:
            bm.create_batch(TEST_BATCH_YEAR)
            print(
                "✅ create_batch() executed successfully. Tables created and data ingested."
            )
        except Exception as e:
            print(f"❌ create_batch() failed: {e}")
            return

        # TEST 2: Listing Batches
        print("\n[Test 2] Testing bm.list_batches()...")
        try:
            batches = bm.list_batches()
            print(f"-> Batches found in DB: {batches}")
            if TEST_BATCH_YEAR in batches:
                print(
                    "✅ list_batches() successfully queried the normalized database and found the batch."
                )
            else:
                print(
                    "❌ list_batches() did NOT find the batch. Query logic might be failing."
                )
        except Exception as e:
            print(f"❌ list_batches() failed: {e}")

        # TEST 3: Verifying Database Records directly
        print("\n[Test 3] Verifying Normalized Database Records via SQLAlchemy...")
        # We are already in app.app_context() here
        student_count = StudentAuth.query.filter_by(batch_year=TEST_BATCH_YEAR).count()
        result_count = AcademicResult.query.filter_by(
            batch_year=TEST_BATCH_YEAR
        ).count()
        subject_count = Subject.query.count()

        print(f"-> Students inserted: {student_count}")
        print(f"-> Academic Results inserted: {result_count}")
        print(f"-> Subjects inserted: {subject_count}")

        if student_count > 0 and result_count > 0 and subject_count > 0:
            print("✅ Data successfully populated in normalized 3NF tables!")

            # Print a sample student to prove relations work
            sample_student = StudentAuth.query.filter_by(
                batch_year=TEST_BATCH_YEAR
            ).first()
            print(
                f"\n[Bonus] Sample Student Extracted: {sample_student.name} ({sample_student.usn})"
            )
            print(
                f"-> Number of subject results recorded for them: {len(sample_student.results)}"
            )
        else:
            print("❌ Data insertion failed. Tables are empty.")


if __name__ == "__main__":
    run_tests()
