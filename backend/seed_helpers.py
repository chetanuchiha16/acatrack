# backend/seed_helpers.py
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import (
    BatchLifecycle,
    Section,
    Subject,
    StudentAuth,
    AcademicResult,
    Teacher,
    SubjectAssignment,
    Mentor,
    BatchStatus,
)
from security import hash_password


async def seed_mock_infra_and_subjects_async(session: AsyncSession) -> None:
    """
    Asynchronously seeds an empty database sandbox with complete mock structure.
    Pre-populates an entire Batch (2023), 4 Sections (A, B, C, D), subjects,
    a demo teacher (demo_teacher / password123), 15 mock students in Section D,
    and their exam marks so that all graphs are immediately visible.
    """
    # 1. Check if batch_lifecycle is already seeded
    batch_year = 2023

    # Pre-hash password once to speed up seeding
    hashed_pw = hash_password("password123")

    # 2. Add Mentor
    mentor = Mentor(name="Dr. Kakashi Hatake")
    session.add(mentor)
    await session.commit()
    await session.refresh(mentor)

    # 3. Add Sections A, B, C, D
    sections = [
        Section(name="A", batch_year=batch_year),
        Section(name="B", batch_year=batch_year),
        Section(name="C", batch_year=batch_year),
        Section(name="D", batch_year=batch_year),
    ]
    session.add_all(sections)
    await session.commit()
    for sec in sections:
        await session.refresh(sec)

    sec_d_id = sections[3].id

    # 4. Add Subjects — using exact codes from fetch_service.py sem_subjects
    # sem1: 7 core VTU 2023 CSE subjects
    # sem5: 7 core VTU 2023 CSE subjects
    subjects = [
        # ── Semester 1 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BMATS101",
            subject_name="Mathematics for CSE Stream-I",
            credits=4,
            semester="sem1",
        ),
        Subject(
            subject_code="BCHES102",
            subject_name="Applied Chemistry for CSE Stream",
            credits=4,
            semester="sem1",
        ),
        Subject(
            subject_code="BCEDK103",
            subject_name="Computer-Aided Engineering Drawing",
            credits=3,
            semester="sem1",
        ),
        Subject(
            subject_code="BPLCK105B",
            subject_name="Introduction to Python Programming",
            credits=3,
            semester="sem1",
        ),
        Subject(
            subject_code="BENGK106",
            subject_name="Communicative English",
            credits=1,
            semester="sem1",
        ),
        Subject(
            subject_code="BICOK107",
            subject_name="Indian Constitution",
            credits=1,
            semester="sem1",
        ),
        Subject(
            subject_code="BIDTK158",
            subject_name="Innovation and Design Thinking",
            credits=1,
            semester="sem1",
        ),
        # ── Semester 5 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS501",
            subject_name="Software Engineering and Project Management",
            credits=4,
            semester="sem5",
        ),
        Subject(
            subject_code="BCS502",
            subject_name="Computer Networks",
            credits=4,
            semester="sem5",
        ),
        Subject(
            subject_code="BCS503",
            subject_name="Theory of Computation",
            credits=4,
            semester="sem5",
        ),
        Subject(
            subject_code="BCSL504",
            subject_name="Web Technology Lab",
            credits=1,
            semester="sem5",
        ),
        Subject(
            subject_code="BCS515B",
            subject_name="Artificial Intelligence",
            credits=3,
            semester="sem5",
        ),
        Subject(
            subject_code="BAIL504",
            subject_name="Data Visualization Lab",
            credits=1,
            semester="sem5",
        ),
        Subject(
            subject_code="BRMK557",
            subject_name="Research Methodology & IPR",
            credits=2,
            semester="sem5",
        ),
    ]
    session.add_all(subjects)
    await session.commit()

    # 5. Add Demo Teacher
    demo_teacher = Teacher(
        username="demo_teacher",
        name="Dr. Hina Uchiha",
        password=hashed_pw,
        email="demo_teacher@acatrack.edu",
        phone="9999911111",
        mentor_id=mentor.id,
    )
    session.add(demo_teacher)
    await session.commit()

    # 6. Add Mock Students (15 in Section D) with marks for all subjects
    student_usns = [f"1XX23CS{str(i).zfill(3)}" for i in range(1, 16)]
    student_names = [
        "Naruto Uzumaki",
        "Sasuke Uchiha",
        "Sakura Haruno",
        "Kakashi Hatake",
        "Bruce Wayne",
        "Clark Kent",
        "Peter Parker",
        "Diana Prince",
        "Tony Stark",
        "Steve Rogers",
        "Wanda Maximoff",
        "Barry Allen",
        "Hinata Hyuga",
        "Rock Lee",
        "Shikamaru Nara",
    ]

    # sem1 theory subjects → IA max 30, SEE max 70
    # sem1 lab/activity subjects → lighter scoring
    # sem5 theory subjects → IA max 30, SEE max 70
    # sem5 lab subjects → IA max 25, SEE max 25
    sem1_theory = [
        ("BMATS101", 4),
        ("BCHES102", 4),
        ("BCEDK103", 3),
        ("BPLCK105B", 3),
    ]
    sem1_light = [
        ("BENGK106", 1),
        ("BICOK107", 1),
        ("BIDTK158", 1),
    ]
    sem5_theory = [
        ("BCS501", 4),
        ("BCS502", 4),
        ("BCS503", 4),
        ("BCS515B", 3),
    ]
    sem5_lab = [
        ("BCSL504", 1),
        ("BAIL504", 1),
        ("BRMK557", 2),
    ]

    for i, usn in enumerate(student_usns):
        name = student_names[i]
        student = StudentAuth(
            usn=usn,
            name=name,
            password=hashed_pw,
            student_email=f"{usn.lower()}@student.acatrack.edu",
            student_phno=f"9999900{str(i).zfill(3)}",
            batch_year=batch_year,
            section_id=sec_d_id,
            mentor_id=mentor.id,
        )
        session.add(student)
        await session.commit()
        await session.refresh(student)

        marks_objs = []

        # sem1 theory: IA 20-30, SEE 42-70 range, varied by student index
        for code, _ in sem1_theory:
            ia = 20 + (i * 3 + ord(code[-1])) % 11  # 20–30
            see = 42 + (i * 7 + ord(code[-1])) % 29  # 42–70
            marks_objs.append(
                AcademicResult(
                    student_id=student.id,
                    subject_code=code,
                    batch_year=batch_year,
                    ia_marks=ia,
                    see_marks=see,
                    total_marks=ia + see,
                )
            )

        # sem1 light (activity/constitution): IA 18-25, SEE 35-50
        for code, _ in sem1_light:
            ia = 18 + (i + ord(code[-1])) % 8  # 18–25
            see = 35 + (i * 5 + ord(code[-1])) % 16  # 35–50
            marks_objs.append(
                AcademicResult(
                    student_id=student.id,
                    subject_code=code,
                    batch_year=batch_year,
                    ia_marks=ia,
                    see_marks=see,
                    total_marks=ia + see,
                )
            )

        # sem5 theory: IA 20-30, SEE 42-70
        for code, _ in sem5_theory:
            ia = 20 + (i * 2 + ord(code[-1])) % 11  # 20–30
            see = 40 + (i * 5 + ord(code[-1])) % 31  # 40–70
            marks_objs.append(
                AcademicResult(
                    student_id=student.id,
                    subject_code=code,
                    batch_year=batch_year,
                    ia_marks=ia,
                    see_marks=see,
                    total_marks=ia + see,
                )
            )

        # sem5 labs: IA 18-25, SEE 18-25
        for code, _ in sem5_lab:
            ia = 18 + (i + ord(code[-1])) % 8  # 18–25
            see = 18 + (i * 3 + ord(code[-1])) % 8  # 18–25
            marks_objs.append(
                AcademicResult(
                    student_id=student.id,
                    subject_code=code,
                    batch_year=batch_year,
                    ia_marks=ia,
                    see_marks=see,
                    total_marks=ia + see,
                )
            )

        session.add_all(marks_objs)

    await session.commit()

    # 7. Add Subject Assignments (demo_teacher teaches sem1 Math and sem5 CN in section D)
    assignment1 = SubjectAssignment(
        teacher_username="demo_teacher",
        subject_code="BMATS101",
        section_id=sec_d_id,
        semester="sem1",
        batch_year=batch_year,
    )
    assignment2 = SubjectAssignment(
        teacher_username="demo_teacher",
        subject_code="BCS502",
        section_id=sec_d_id,
        semester="sem5",
        batch_year=batch_year,
    )
    session.add_all([assignment1, assignment2])

    # 8. Create BatchLifecycle (ACTIVE)
    lifecycle = BatchLifecycle(
        batch_year=batch_year,
        status=BatchStatus.ACTIVE,
        section_count=4,
        subject_count=14,
        student_count=15,
        assignment_count=2,
    )
    session.add(lifecycle)
    await session.commit()
