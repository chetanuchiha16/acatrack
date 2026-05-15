from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.schema import Section, Subject, StudentAuth, ParentAuth, SubjectAssignment, Mentor, Teacher
from security import hash_password
from logger_config import get_logger
from typing import List, Dict, Optional

logger = get_logger(__name__)

class AcademicService:
    @staticmethod
    async def initialize_batch(session: AsyncSession, batch_year: int, sections: List[str]):
        """Creates sections for a given batch year if they don't already exist."""
        for section_name in sections:
            stmt = select(Section).where(Section.name == section_name, Section.batch_year == batch_year)
            result = await session.execute(stmt)
            if not result.scalar_one_or_none():
                new_section = Section(name=section_name, batch_year=batch_year)
                session.add(new_section)
                logger.info(f"Created section {section_name} for batch {batch_year}")
        await session.commit()

    @staticmethod
    async def register_subjects(session: AsyncSession, semester: str, subjects: List[Dict]):
        """
        Registers or updates subjects for a specific semester.
        subjects: [{'code': 'CS101', 'name': 'Intro to CS', 'credits': 4}, ...]
        """
        for sub_data in subjects:
            code = sub_data['code'].strip().upper()
            stmt = select(Subject).where(Subject.subject_code == code)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                existing.subject_name = sub_data['name']
                existing.credits = sub_data['credits']
                existing.semester = semester.lower().strip()
                logger.debug(f"Updated subject {code}")
            else:
                new_sub = Subject(
                    subject_code=code,
                    subject_name=sub_data['name'],
                    semester=semester.lower().strip(),
                    credits=sub_data['credits']
                )
                session.add(new_sub)
                logger.info(f"Registered new subject {code}")
        await session.commit()

    @staticmethod
    async def enroll_students(session: AsyncSession, batch_year: int, section_name: str, students: List[Dict]):
        """
        Enrolls a list of students into a specific batch and section.
        Creates parent account shells automatically.
        students: [{'usn': '...', 'name': '...', 'email': '...', 'phone': '...'}, ...]
        """
        stmt = select(Section).where(Section.name == section_name, Section.batch_year == batch_year)
        section = (await session.execute(stmt)).scalar_one_or_none()
        if not section:
            raise ValueError(f"Section {section_name} for batch {batch_year} not found. Initialize batch first.")

        for s_data in students:
            usn = s_data['usn'].strip().upper()
            stmt = select(StudentAuth).where(StudentAuth.usn == usn)
            student = (await session.execute(stmt)).scalar_one_or_none()
            
            if student:
                student.name = s_data['name']
                student.section_id = section.id
                student.batch_year = batch_year
                logger.debug(f"Updated student {usn}")
            else:
                student = StudentAuth(
                    usn=usn,
                    name=s_data['name'],
                    batch_year=batch_year,
                    section_id=section.id,
                    student_email=s_data.get('email'),
                    student_phno=s_data.get('phone')
                )
                session.add(student)
                await session.flush()
                
                # Create Parent shell
                parent_username = f"{usn}_parent"
                # Check if parent already exists (unlikely but safe)
                p_stmt = select(ParentAuth).where(ParentAuth.username == parent_username)
                if not (await session.execute(p_stmt)).scalar_one_or_none():
                    parent = ParentAuth(
                        username=parent_username,
                        password=hash_password("default123"),
                        name=f"Parent of {s_data['name']}",
                        student_id=student.id
                    )
                    session.add(parent)
                logger.info(f"Enrolled student {usn} and created parent shell")
        await session.commit()

    @staticmethod
    async def assign_subject_to_teacher(session: AsyncSession, teacher_username: str, subject_code: str, section_id: int, semester: str, batch_year: int):
        """Maps a teacher to a specific subject and section for a semester."""
        subject_code = subject_code.strip().upper()
        semester = semester.lower().strip()
        
        # Verify entities exist
        t_stmt = select(Teacher).where(Teacher.username == teacher_username)
        s_stmt = select(Subject).where(Subject.subject_code == subject_code)
        sec_stmt = select(Section).where(Section.id == section_id)
        
        if not (await session.execute(t_stmt)).scalar_one_or_none():
            raise ValueError(f"Teacher {teacher_username} not found")
        if not (await session.execute(s_stmt)).scalar_one_or_none():
            raise ValueError(f"Subject {subject_code} not found")
        if not (await session.execute(sec_stmt)).scalar_one_or_none():
            raise ValueError(f"Section ID {section_id} not found")

        # Create or update assignment
        stmt = select(SubjectAssignment).where(
            SubjectAssignment.teacher_username == teacher_username,
            SubjectAssignment.subject_code == subject_code,
            SubjectAssignment.section_id == section_id,
            SubjectAssignment.semester == semester
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        
        if not existing:
            assignment = SubjectAssignment(
                teacher_username=teacher_username,
                subject_code=subject_code,
                section_id=section_id,
                semester=semester,
                batch_year=batch_year
            )
            session.add(assignment)
            logger.info(f"Assigned {teacher_username} to {subject_code} in section {section_id}")
        
        await session.commit()
