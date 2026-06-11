# backend/seed_helpers.py
from sqlalchemy.ext.asyncio import AsyncSession
from models.schema import (
    BatchLifecycle,
    Section,
    Subject,
    StudentAuth,
    ParentAuth,
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
        # ── Semester 2 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BMATS201",
            subject_name="Mathematics-II for CSE Stream",
            credits=4,
            semester="sem2",
        ),
        Subject(
            subject_code="BPHYS202",
            subject_name="Applied Physics for CSE Stream",
            credits=4,
            semester="sem2",
        ),
        Subject(
            subject_code="BPOPS203",
            subject_name="Principles of Programming Using C",
            credits=3,
            semester="sem2",
        ),
        Subject(
            subject_code="BPWSK206",
            subject_name="Professional Writing Skills in English",
            credits=1,
            semester="sem2",
        ),
        Subject(
            subject_code="BKSKK207",
            subject_name="Samskrutika Kannada",
            credits=1,
            semester="sem2",
        ),
        Subject(
            subject_code="BSFHK258",
            subject_name="Scientific Foundations of Health",
            credits=1,
            semester="sem2",
        ),
        # ── Semester 3 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS301",
            subject_name="Mathematics for Computer Science",
            credits=4,
            semester="sem3",
        ),
        Subject(
            subject_code="BCS302",
            subject_name="Digital Design & Computer Organization",
            credits=4,
            semester="sem3",
        ),
        Subject(
            subject_code="BCS303",
            subject_name="Operating Systems",
            credits=3,
            semester="sem3",
        ),
        Subject(
            subject_code="BCS304",
            subject_name="Data Structures and Applications",
            credits=3,
            semester="sem3",
        ),
        Subject(
            subject_code="BCSL305",
            subject_name="Data Structures Lab",
            credits=1,
            semester="sem3",
        ),
        Subject(
            subject_code="BSCK307",
            subject_name="Social Connect and Responsibility",
            credits=1,
            semester="sem3",
        ),
        # ── Semester 4 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS401",
            subject_name="Analysis & Design of Algorithms",
            credits=4,
            semester="sem4",
        ),
        Subject(
            subject_code="BCS402",
            subject_name="Microcontrollers",
            credits=4,
            semester="sem4",
        ),
        Subject(
            subject_code="BCS403",
            subject_name="Database Management Systems",
            credits=3,
            semester="sem4",
        ),
        Subject(
            subject_code="BCSL404",
            subject_name="Analysis & Design of Algorithms Lab",
            credits=1,
            semester="sem4",
        ),
        Subject(
            subject_code="BBOC407",
            subject_name="Biology for Computer Engineers",
            credits=1,
            semester="sem4",
        ),
        Subject(
            subject_code="BUHK408",
            subject_name="Universal Human Values",
            credits=1,
            semester="sem4",
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
        # ── Semester 6 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS601",
            subject_name="Software Engineering",
            credits=4,
            semester="sem6",
        ),
        Subject(
            subject_code="BCS602",
            subject_name="Compiler Design",
            credits=4,
            semester="sem6",
        ),
        Subject(
            subject_code="BCS603",
            subject_name="Computer Graphics",
            credits=3,
            semester="sem6",
        ),
        # ── Semester 7 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS701",
            subject_name="Machine Learning",
            credits=4,
            semester="sem7",
        ),
        Subject(
            subject_code="BCS702",
            subject_name="Cloud Computing",
            credits=4,
            semester="sem7",
        ),
        # ── Semester 8 ──────────────────────────────────────────────────────
        Subject(
            subject_code="BCS801",
            subject_name="Project Work",
            credits=6,
            semester="sem8",
        ),
        Subject(
            subject_code="BCS802",
            subject_name="Seminar",
            credits=2,
            semester="sem8",
        ),
    ]
    session.add_all(subjects)
    await session.commit()

    # 5. Add Demo Teacher
    demo_teacher = Teacher(
        username="demo_teacher",
        name="Dr. Elara Voss",
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
        "Rin Tohsaka",
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
    sem2_theory = [
        ("BMATS201", 4),
        ("BPHYS202", 4),
        ("BPOPS203", 3),
    ]
    sem2_light = [
        ("BPWSK206", 1),
        ("BKSKK207", 1),
        ("BSFHK258", 1),
    ]
    sem3_theory = [
        ("BCS301", 4),
        ("BCS302", 4),
        ("BCS303", 3),
        ("BCS304", 3),
    ]
    sem3_light = [
        ("BCSL305", 1),
        ("BSCK307", 1),
    ]
    sem4_theory = [
        ("BCS401", 4),
        ("BCS402", 4),
        ("BCS403", 3),
    ]
    sem4_light = [
        ("BCSL404", 1),
        ("BBOC407", 1),
        ("BUHK408", 1),
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

        # Create corresponding Parent shell
        parent = ParentAuth(
            username=f"{usn}_parent",
            password=hashed_pw,  # use pre-hashed password
            name=f"Parent of {name}",
            email=f"{usn.lower()}_parent@example.com",
            phone=f"9999911{str(i).zfill(3)}",
            student_id=student.id,
        )
        session.add(parent)

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

        # sem2 theory: IA 20-30, SEE 42-70
        for code, _ in sem2_theory:
            ia = 20 + (i * 3 + ord(code[-1])) % 11
            see = 42 + (i * 7 + ord(code[-1])) % 29
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

        # sem2 light: IA 18-25, SEE 35-50
        for code, _ in sem2_light:
            ia = 18 + (i + ord(code[-1])) % 8
            see = 35 + (i * 5 + ord(code[-1])) % 16
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

        # sem3 theory: IA 20-30, SEE 40-70
        for code, _ in sem3_theory:
            ia = 20 + (i * 2 + ord(code[-1])) % 11
            see = 40 + (i * 6 + ord(code[-1])) % 31
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

        # sem3 light: IA 18-25, SEE 35-50
        for code, _ in sem3_light:
            ia = 18 + (i + ord(code[-1])) % 8
            see = 35 + (i * 4 + ord(code[-1])) % 16
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

        # sem4 theory: IA 21-30, SEE 41-70
        for code, _ in sem4_theory:
            ia = 21 + (i * 2 + ord(code[-1])) % 10
            see = 41 + (i * 6 + ord(code[-1])) % 30
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

        # sem4 light: IA 18-25, SEE 35-50
        for code, _ in sem4_light:
            ia = 18 + (i + ord(code[-1])) % 8
            see = 35 + (i * 4 + ord(code[-1])) % 16
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
        subject_count=39,
        student_count=15,
        assignment_count=2,
    )
    session.add(lifecycle)
    await session.commit()
