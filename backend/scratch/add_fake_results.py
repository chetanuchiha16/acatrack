# backend/scratch/add_fake_results.py
import asyncio
import sys
import os
import random

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from models.schema import StudentAuth, Subject, AcademicResult
from services.academic_service import BatchLifecycleService
from sqlalchemy import select

async def main():
    print("🚀 Initializing Fake Results Generation for Demo Students...")
    async with AsyncSessionLocal() as session:
        # 1. Fetch demo students
        # We look for specific USNs or students with "Demo" in their name (case-insensitive)
        stmt = select(StudentAuth).where(
            (StudentAuth.usn.in_(["1JS23CS999", "1EX23CS000"])) |
            (StudentAuth.name.ilike("%demo%"))
        )
        students = (await session.execute(stmt)).scalars().all()
        
        if not students:
            print("❌ No demo students found in the database. Please run setup_demo.py first.")
            return
            
        print(f"Found {len(students)} demo student(s):")
        for s in students:
            print(f" - {s.name} ({s.usn}), Batch: {s.batch_year}, ID: {s.id}")
            
        # 2. Fetch all subjects
        stmt_sub = select(Subject)
        subjects = (await session.execute(stmt_sub)).scalars().all()
        if not subjects:
            print("❌ No subjects found in the database.")
            return
            
        print(f"Found {len(subjects)} subject(s) in the database.")
        
        # 3. Generate fake results for each student and subject
        results_added = 0
        results_updated = 0
        
        for student in students:
            print(f"\nGenerating results for student: {student.name} ({student.usn})...")
            
            # Fetch existing results to avoid duplicate/unique key violations
            stmt_res = select(AcademicResult).where(AcademicResult.student_id == student.id)
            existing_results = (await session.execute(stmt_res)).scalars().all()
            existing_map = {r.subject_code: r for r in existing_results}
            
            for subject in subjects:
                # Generate realistic random marks
                # IA: 20 to 45 (passing is >= 20)
                # SEE: 20 to 50 (passing is >= 18)
                # Total: IA + SEE (out of 100)
                ia = random.randint(22, 45)
                see = random.randint(20, 50)
                total = ia + see
                
                if subject.subject_code in existing_map:
                    # Update existing result
                    res_obj = existing_map[subject.subject_code]
                    res_obj.ia_marks = ia
                    res_obj.see_marks = see
                    res_obj.total_marks = total
                    results_updated += 1
                else:
                    # Create new result
                    res_obj = AcademicResult(
                        student_id=student.id,
                        subject_code=subject.subject_code,
                        batch_year=student.batch_year,
                        ia_marks=ia,
                        see_marks=see,
                        total_marks=total
                    )
                    session.add(res_obj)
                    results_added += 1
            
            # Refresh batch lifecycle
            await BatchLifecycleService.refresh_counts_and_status(session, student.batch_year)
            print(f"✅ Refreshed Batch Lifecycle counts for Batch {student.batch_year}")
            
        # Commit the transaction
        await session.commit()
        print(f"\n🎉 Successfully saved results: {results_added} created, {results_updated} updated!")

if __name__ == "__main__":
    asyncio.run(main())
