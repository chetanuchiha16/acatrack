# backend/scratch/add_student_to_all_sections.py
import asyncio
import sys
import os
import random

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from models.schema import Section, StudentAuth, Subject, AcademicResult
from services.academic_service import BatchLifecycleService
from sqlalchemy import select

async def main():
    print("🚀 Initializing Student and Marks Generation for All Sections of Batch 2023...")
    async with AsyncSessionLocal() as session:
        # 1. Fetch all sections for Batch 2023
        stmt_sections = select(Section).where(Section.batch_year == 2023)
        sections = (await session.execute(stmt_sections)).scalars().all()
        
        if not sections:
            print("❌ No sections found for Batch 2023 in the database.")
            return
            
        print(f"Found {len(sections)} section(s) for Batch 2023:")
        for sec in sections:
            print(f" - ID: {sec.id}, Name: {sec.name}")
            
        # 2. Fetch all subjects
        stmt_sub = select(Subject)
        subjects = (await session.execute(stmt_sub)).scalars().all()
        if not subjects:
            print("❌ No subjects found in the database.")
            return
        print(f"Found {len(subjects)} subject(s) in the database.")
        
        students_created = 0
        results_created = 0
        
        # 3. For each section, add one student and generate their marks
        for sec in sections:
            # We construct a unique USN for this section's student, e.g. 1JS23CS + SectionName + 99
            # Section names can be "A", "B", "C", "D". If it's a longer name, we sanitize it.
            clean_name = sec.name.replace("-", "").strip()
            usn_suffix = clean_name[:2].upper() + "99"
            student_usn = f"1JS23{usn_suffix[:5]}"
            
            # Pad or truncate to maintain standard USN format
            if len(student_usn) > 10:
                student_usn = student_usn[:10]
            elif len(student_usn) < 10:
                student_usn = student_usn.ljust(10, "9")
                
            student_name = f"Demo Student {sec.name}"
            
            # Check if student already exists
            stmt_stud = select(StudentAuth).where(StudentAuth.usn == student_usn)
            student = (await session.execute(stmt_stud)).scalar_one_or_none()
            
            if not student:
                student = StudentAuth(
                    usn=student_usn,
                    name=student_name,
                    batch_year=2023,
                    student_email=f"demo.{clean_name.lower()}@example.com",
                    section_id=sec.id
                )
                session.add(student)
                await session.flush()
                await session.refresh(student)
                print(f"\n✅ Created Student: {student.name} ({student.usn}) in Section {sec.name} (ID: {sec.id})")
                students_created += 1
            else:
                print(f"\nℹ️ Student already exists: {student.name} ({student.usn}) in Section {sec.name}")
                
            # Now generate marks/results for this student across all subjects
            stmt_res = select(AcademicResult).where(AcademicResult.student_id == student.id)
            existing_results = (await session.execute(stmt_res)).scalars().all()
            existing_subjects = {r.subject_code for r in existing_results}
            
            for subject in subjects:
                if subject.subject_code not in existing_subjects:
                    # Generate realistic passing marks
                    ia = random.randint(22, 45)
                    see = random.randint(20, 50)
                    total = ia + see
                    
                    res_obj = AcademicResult(
                        student_id=student.id,
                        subject_code=subject.subject_code,
                        batch_year=2023,
                        ia_marks=ia,
                        see_marks=see,
                        total_marks=total
                    )
                    session.add(res_obj)
                    results_created += 1
                    
        # Refresh batch lifecycle
        await BatchLifecycleService.refresh_counts_and_status(session, 2023)
        print("\n✅ Refreshed Batch Lifecycle counts for Batch 2023.")
        
        # Commit the transaction
        await session.commit()
        print(f"\n🎉 Successfully completed! Created {students_created} students and {results_created} marks/results across all sections.")

if __name__ == "__main__":
    asyncio.run(main())
