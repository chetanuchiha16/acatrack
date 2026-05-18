import asyncio
import sys
import os

# Add backend to path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from models.schema import Mentor, StudentAuth, Teacher, ParentAuth
from security import hash_password
from sqlalchemy import select


async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if dummy student already exists
        result = await session.execute(select(StudentAuth).filter_by(usn="1EX23CS000"))
        if result.scalar_one_or_none():
            print("Dummy student (1EX23CS000) already exists. Skipping seed.")
            return

        password_hash = hash_password("123")

        # 1. Create Mentor
        mentor = Mentor(name="Demo Mentor")
        session.add(mentor)
        await session.flush()  # Get mentor ID

        # 1.5 Create Section
        from models.schema import Section, Subject, SubjectAssignment

        section = Section(name="A", batch_year=2023)
        session.add(section)
        await session.flush()

        # 2. Create Staff (Teacher)
        staff = Teacher(
            username="staff",
            name="Demo Staff",
            password=password_hash,
            mentor_id=mentor.id,
            email="staff_demo@example.com",
            phone="9876543210",
        )
        session.add(staff)

        # 3. Create Student
        student = StudentAuth(
            usn="1EX23CS000",
            name="Demo Student",
            batch_year=2023,
            password=password_hash,
            student_email="student_demo@example.com",
            student_phno="1234567890",
            mentor_id=mentor.id,
            section_id=section.id,
        )
        session.add(student)
        await session.flush()  # Get student ID

        # 3.5 Create Subject & Assignment
        subject = Subject(
            subject_code="DEMO101",
            subject_name="Demo Subject",
            semester="sem1",
            credits=4,
        )
        session.add(subject)
        await session.flush()

        assignment = SubjectAssignment(
            teacher_username="staff",
            subject_code="DEMO101",
            section_id=section.id,
            semester="sem1",
            batch_year=2023,
        )
        session.add(assignment)

        # 4. Create Parent
        parent = ParentAuth(
            username="parent",
            password=password_hash,
            name="Demo Parent",
            email="parent_demo@example.com",
            phone="5566778899",
            relation="Guardian",
            student_id=student.id,
        )
        session.add(parent)

        await session.commit()
        print("✅ Demo Seed data created successfully!")
        print("Student USN: 1EX23CS000, Password: 123")
        print("Staff Username: staff, Password: 123")
        print("Parent Username: parent, Password: 123")


if __name__ == "__main__":
    asyncio.run(seed_data())
