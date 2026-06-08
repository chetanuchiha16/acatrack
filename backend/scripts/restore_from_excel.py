"""
restore_from_excel.py
=====================
Restores all real student, staff, mentor, section, and parent data
directly from the backend/scratch Excel files into the configured
PostgreSQL database (acatrack).

Run from the backend/ directory:
    uv run python scripts/restore_from_excel.py
"""
import asyncio
import sys
import os
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
from sqlalchemy import create_engine, select as sa_select, text
from sqlalchemy.orm import sessionmaker

from settings import settings
from security import hash_password
from models.schema import StudentAuth, Teacher, Mentor, Section, ParentAuth, Subject, SubjectAssignment


# ─── Build a synchronous DB URL from whatever is in .env ───────────────────────
def _sync_url():
    raw = settings.database_url
    if raw.startswith("postgresql+asyncpg://"):
        return raw.replace("postgresql+asyncpg://", "postgresql://", 1)
    return raw


SCRATCH = os.path.join(os.path.dirname(__file__), "..", "scratch")

BATCH_CONFIGS = [
    {"year": 2023, "enrollment": "students_enrollment_2023.xlsx", "mentor_map": "mentor_mapping_2023.xlsx", "sections": ["A", "B", "C"]},
    {"year": 2022, "enrollment": "students_enrollment_2022.xlsx", "mentor_map": "mentor_mapping_2022.xlsx", "sections": ["A", "B", "C", "D", "E", "F"]},
]

SUBJECT_FILES = {
    "sem1": "subjects_sem1.xlsx",
    "sem2": "subjects_sem2.xlsx",
    "sem3": "subjects_sem3.xlsx",
    "sem4": "subjects_sem4.xlsx",
    "sem5": "subjects_sem5.xlsx",
}


def _safe_seed(name: str) -> str:
    """Derive the deterministic password prefix from a student name (mirrors admin_service)."""
    if not name:
        return "student"
    words = re.split(r"\s+", name.strip())
    return (words[0][:4] if words else "stud").lower()


def _unique_username(session, base: str) -> str:
    """Guarantee unique teacher usernames by appending a counter if needed."""
    candidate = base
    counter = 1
    while session.execute(sa_select(Teacher).where(Teacher.username == candidate)).scalars().first():
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


def main():
    engine = create_engine(_sync_url(), pool_pre_ping=True)
    Session = sessionmaker(bind=engine)

    with Session() as session:
        print("=" * 60)
        print("AcaTrack Database Restore from Excel")
        print("=" * 60)

        # ── 1. Staff ──────────────────────────────────────────────────
        print("\n[1/5] Importing Staff from staff.xlsx ...")
        staff_df = pd.read_excel(os.path.join(SCRATCH, "staff.xlsx"))
        staff_count = 0
        for _, row in staff_df.iterrows():
            name = str(row["Name"]).strip()
            email = str(row.get("Email", "")).strip()
            if not name:
                continue
            username = _unique_username(session, email.split("@")[0] if "@" in email else name.lower().replace(" ", "_")[:12])
            plain_pw = f"staff_{username}"
            existing = session.execute(sa_select(Teacher).where(Teacher.username == username)).scalars().first()
            if existing:
                print(f"  ⤷ Staff '{username}' already exists — skipped")
                continue
            mentor = Mentor(name=name)
            session.add(mentor)
            session.flush()
            teacher = Teacher(
                username=username,
                name=name,
                email=email,
                phone="",
                password=hash_password(plain_pw),
                mentor_id=mentor.id,
            )
            session.add(teacher)
            session.flush()
            staff_count += 1
            print(f"  ✓ {name} → username={username}  password={plain_pw}")
        session.commit()
        print(f"  Done: {staff_count} staff imported.")

        # ── 2. Sections + Students per batch ─────────────────────────
        print("\n[2/5] Importing Sections & Students ...")
        for cfg in BATCH_CONFIGS:
            year = cfg["year"]
            enroll_file = os.path.join(SCRATCH, cfg["enrollment"])
            if not os.path.exists(enroll_file):
                print(f"  ⚠ {cfg['enrollment']} not found, skipping batch {year}")
                continue

            df = pd.read_excel(enroll_file)
            print(f"\n  Batch {year}: {len(df)} students from {cfg['enrollment']}")

            # Create sections
            section_map = {}
            for sec_name in cfg["sections"]:
                existing_sec = session.execute(
                    sa_select(Section).where(Section.name == sec_name, Section.batch_year == year)
                ).scalars().first()
                if existing_sec:
                    section_map[sec_name] = existing_sec
                else:
                    sec = Section(name=sec_name, batch_year=year)
                    session.add(sec)
                    session.flush()
                    section_map[sec_name] = sec
            session.commit()
            print(f"  ✓ Sections: {list(section_map.keys())}")

            # Default section is first
            default_section = section_map[cfg["sections"][0]]

            student_count = 0
            for _, row in df.iterrows():
                usn = str(row["usn"]).strip().upper()
                name = str(row["name"]).strip()
                email = str(row.get("email", "")).strip()
                phone = str(row.get("phone", "")).strip()
                if not usn or not name or usn == "NAN":
                    continue
                existing = session.execute(sa_select(StudentAuth).where(StudentAuth.usn == usn)).scalars().first()
                if existing:
                    continue
                plain_pw = f"{_safe_seed(name)}{usn[-3:]}"
                student = StudentAuth(
                    usn=usn,
                    name=name,
                    batch_year=year,
                    password=hash_password(plain_pw),
                    student_email=email,
                    student_phno=phone,
                    section_id=default_section.id,
                )
                session.add(student)
                student_count += 1
            session.commit()
            print(f"  ✓ {student_count} students imported for batch {year}")

        # ── 3. Mentor Mapping ─────────────────────────────────────────
        print("\n[3/5] Applying Mentor Mappings ...")
        for cfg in BATCH_CONFIGS:
            year = cfg["year"]
            mentor_file = os.path.join(SCRATCH, cfg["mentor_map"])
            if not os.path.exists(mentor_file):
                print(f"  ⚠ {cfg['mentor_map']} not found, skipping")
                continue

            mdf = pd.read_excel(mentor_file)
            print(f"\n  Batch {year}: {len(mdf)} mentor-student mappings")

            mapped = 0
            for _, row in mdf.iterrows():
                mentor_username = str(row.get("Mentor_Username", "")).strip()
                student_usn = str(row.get("student_usn", "")).strip().upper()
                if not mentor_username or not student_usn:
                    continue

                teacher = session.execute(
                    sa_select(Teacher).where(Teacher.username == mentor_username)
                ).scalars().first()
                student = session.execute(
                    sa_select(StudentAuth).where(StudentAuth.usn == student_usn)
                ).scalars().first()

                if not teacher:
                    print(f"  ⚠ Teacher '{mentor_username}' not found, skipping {student_usn}")
                    continue
                if not student:
                    print(f"  ⚠ Student '{student_usn}' not found, skipping")
                    continue

                student.mentor_id = teacher.mentor_id
                mapped += 1

            session.commit()
            print(f"  ✓ {mapped} mentor-student links applied")

        # ── 4. Parents ────────────────────────────────────────────────
        print("\n[4/5] Creating Parent accounts for all students ...")
        all_students = session.execute(sa_select(StudentAuth)).scalars().all()
        parent_count = 0
        for student in all_students:
            existing_parent = session.execute(
                sa_select(ParentAuth).where(ParentAuth.student_id == student.id)
            ).scalars().first()
            if existing_parent:
                continue
            parent_username = f"p_{student.usn.lower()}"
            plain_pw = f"parent{student.usn[-3:]}"
            parent = ParentAuth(
                username=parent_username,
                name=f"Parent of {student.name}",
                email=student.student_email or "",
                phone=student.student_phno or "",
                relation="Guardian",
                password=hash_password(plain_pw),
                student_id=student.id,
            )
            session.add(parent)
            parent_count += 1
        session.commit()
        print(f"  ✓ {parent_count} parent accounts created")

        # ── 5. Summary ────────────────────────────────────────────────
        total_students = session.execute(sa_select(StudentAuth)).scalars().all()
        total_staff = session.execute(sa_select(Teacher)).scalars().all()
        total_parents = session.execute(sa_select(ParentAuth)).scalars().all()

        print("\n" + "=" * 60)
        print("✅ Restore Complete!")
        print(f"   Students : {len(total_students)}")
        print(f"   Staff    : {len(total_staff)}")
        print(f"   Parents  : {len(total_parents)}")
        print("=" * 60)
        print("\nLogin credentials format:")
        print("  Student : USN as username, password = first4LettersOfName + last3ofUSN")
        print("            e.g.  1XX23CS001  →  john001")
        print("  Staff   : email-prefix as username, password = staff_<username>")
        print("  Parent  : p_<usn_lowercase> as username, password = parent<last3ofUSN>")
        print("            e.g.  p_1xx23cs001  →  parent001")

    engine.dispose()


if __name__ == "__main__":
    main()
