# backend/scratch/setup_demo.py
import asyncio
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from models.schema import Section, StudentAuth, Subject, Teacher, SubjectAssignment, ParentAuth
from services.academic_service import BatchLifecycleService
from sqlalchemy import select


async def main():
    print("🚀 Initializing Demo Setup...")
    async with AsyncSessionLocal() as session:
        # 1. Initialize Batch 2023 Section D
        batch_year = 2023
        section_name = "D"

        # Check or create Section D
        stmt = select(Section).where(
            Section.name == section_name, Section.batch_year == batch_year
        )
        section = (await session.execute(stmt)).scalar_one_or_none()
        if not section:
            section = Section(name=section_name, batch_year=batch_year)
            session.add(section)
            await session.commit()
            await session.refresh(section)
            print(f"✅ Created Section {section_name} for Batch {batch_year}")
        else:
            print(
                f"ℹ️ Section {section_name} for Batch {batch_year} already exists (ID: {section.id})"
            )

        # 2. Check or create demo teacher 'demostaff'
        teacher_username = "demostaff"
        stmt = select(Teacher).where(Teacher.username == teacher_username)
        teacher = (await session.execute(stmt)).scalar_one_or_none()
        if not teacher:
            teacher = Teacher(
                username=teacher_username,
                name="Demo Staff",
                email="demostaff@example.com",
            )
            session.add(teacher)
            await session.commit()
            await session.refresh(teacher)
            print(f"✅ Created Teacher: {teacher.name} (@{teacher.username})")
        else:
            print(f"ℹ️ Teacher already exists: {teacher.name} (@{teacher.username})")

        # 3. Check or create subject 'CS101'
        subject_code = "CS101"
        stmt = select(Subject).where(Subject.subject_code == subject_code)
        subject = (await session.execute(stmt)).scalar_one_or_none()
        if not subject:
            subject = Subject(
                subject_code=subject_code,
                subject_name="Introduction to Computer Science",
                semester="sem1",
                credits=4,
            )
            session.add(subject)
            await session.commit()
            await session.refresh(subject)
            print(
                f"✅ Created Subject: {subject.subject_name} ({subject.subject_code})"
            )
        else:
            print(
                f"ℹ️ Subject already exists: {subject.subject_name} ({subject.subject_code})"
            )

        # 4. Check or create a demo student in Section D
        student_usn = "1JS23CS999"
        stmt = select(StudentAuth).where(StudentAuth.usn == student_usn)
        student = (await session.execute(stmt)).scalar_one_or_none()
        if not student:
            student = StudentAuth(
                usn=student_usn,
                name="Alice Demo",
                batch_year=batch_year,
                student_email="alice.demo@example.com",
                section_id=section.id,
            )
            session.add(student)
            await session.commit()
            await session.refresh(student)
            print(
                f"✅ Enrolled Student: {student.name} ({student.usn}) in Section {section_name}"
            )
        else:
            print(f"ℹ️ Student already exists: {student.name} ({student.usn})")

        # 4b. Check or create a demo parent linked to the student
        parent_username = "1JS23CS999_parent"
        stmt = select(ParentAuth).where(ParentAuth.username == parent_username)
        parent = (await session.execute(stmt)).scalar_one_or_none()
        if not parent:
            from security import hash_password
            parent = ParentAuth(
                username=parent_username,
                password=hash_password("password123"),
                name="Bob Parent (Alice)",
                email="bob.parent@example.com",
                phone="9999911999",
                student_id=student.id,
            )
            session.add(parent)
            await session.commit()
            print(f"✅ Created Parent: {parent.name} (@{parent.username})")
        else:
            print(f"ℹ️ Parent already exists: {parent.name} (@{parent.username})")

        # 5. Create active SubjectAssignment for demostaff -> CS101 -> Section D
        stmt = select(SubjectAssignment).where(
            SubjectAssignment.teacher_username == teacher_username,
            SubjectAssignment.subject_code == subject_code,
            SubjectAssignment.section_id == section.id,
            SubjectAssignment.semester == "sem1",
        )
        assignment = (await session.execute(stmt)).scalar_one_or_none()
        if not assignment:
            assignment = SubjectAssignment(
                teacher_username=teacher_username,
                subject_code=subject_code,
                section_id=section.id,
                semester="sem1",
                batch_year=batch_year,
            )
            session.add(assignment)
            await session.commit()
            print(
                f"✅ Created SubjectAssignment: {teacher_username} -> {subject_code} in Section {section_name}"
            )
        else:
            print(
                f"ℹ️ SubjectAssignment already exists for {teacher_username} in Section {section_name}"
            )

        # 6. Refresh Batch Lifecycle Status & Counts
        await BatchLifecycleService.refresh_counts_and_status(session, batch_year)
        print(
            "✅ Refreshed Batch Lifecycle status and assignment/student counts successfully!"
        )


if __name__ == "__main__":
    asyncio.run(main())
