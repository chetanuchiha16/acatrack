import psycopg2
import pandas as pd
import os
import sys

# Predefined subject code to name map from fetch_service.py
sem_subjects = {
    "BMATS101": "Mathematics for CSE Stream-I",
    "BCHES102": "Applied Chemistry for CSE Stream",
    "BCEDK103": "Computer-Aided Engineering Drawing",
    "BENGK106": "Communicative English",
    "BICOK107": "Indian Constitution",
    "BIDTK158": "Innovation and Design Thinking",
    "BESCK104A": "Introduction to Civil Engineering",
    "BETCK105H": "Introduction to Internet of Things (IoT)",
    "BESCK104C": "Introduction TO Electronics Engineering",
    "BPLCK105B": "Introduction TO to Python Programming",
    "BMAT201": "Mathematics for CSE Stream-II",
    "BMATS201": "Mathematics-II for CSE Stream",
    "BPHYS202": "Applied Physics for CSE Stream",
    "BPOPS203": "Principles of Programming Using C",
    "BPWSK206": "Professional Writing Skills in English",
    "BKSKK207": "Samskrutika Kannada",
    "BKBKK207": "Balake Kannada",
    "BSFHK258": "Scientific Foundations of Health",
    "BPLCK205B": "Introduction to Python Programming",
    "BESCK204C": "Introduction to Electronics Engineering",
    "BESCK204D": "Introduction To Mechanical Engineering",
    "BCS301": "Mathematics for Computer Science",
    "BCS302": "Digital Design & Computer Organization",
    "BCS303": "Operating Systems",
    "BCS304": "Data Structures and Applications",
    "BCSL305": "Data Structures Lab",
    "BSCK307": "Social Connect and Responsibility",
    "BNSK359": "National Service Scheme (NSS)",
    "BCS306A": "Object Oriented Programming with Java",
    "BCS358D": "Data Visualization with Python",
    "BCS401": "Analysis & Design of Algorithms",
    "BCS402": "Microcontrollers",
    "BCS403": "Database Management Systems",
    "BCSL404": "Analysis & Design of Algorithms Lab",
    "BBOC407": "Biology for Computer Engineers",
    "BUHK408": "Universal Human Values",
    "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": "Physical Education or NSS",
    "BCS405B": "Graph Theory",
    "BCSL456D": "Technical Writing using LaTeX",
    "BCS501": "Software Engineering and Project Management",
    "BCS502": "Computer Networks",
    "BCS503": "Theory of Computation",
    "BCSL504": "Web Technology Lab",
    "BAI515A": "Computer Graphics",
    "BCS515B": "Artificial Intelligence",
    "BCS515C": "Unix System Programming",
    "BCS515D": "Distributed Systems",
    "BAIL504": "Data Visualization Lab",
    "BRMK557": "Research Methodology & IPR",
    "BES508": "Environmental Studies",
    "BCS586": "Mini Project",
}

def get_subject_name(code):
    clean_code = code.upper().strip()
    return sem_subjects.get(clean_code, f"{clean_code} Course")

def generate():
    os.makedirs("scratch", exist_ok=True)
    
    conn = psycopg2.connect("postgresql://chetan:4myHina!@localhost:5432/Group_Project?sslmode=disable")
    cur = conn.cursor()

    # 1. Fetch and generate Students
    print("Generating students...")
    cur.execute("SELECT username, name, student_email, student_phno FROM students;")
    students_data = cur.fetchall()
    df_students = pd.DataFrame(students_data, columns=["usn", "name", "email", "phone"])
    df_students["usn"] = df_students["usn"].str.strip().str.upper()
    df_students["name"] = df_students["name"].str.strip()
    df_students["email"] = df_students["email"].str.strip()
    df_students["phone"] = df_students["phone"].astype(str).str.strip()
    
    # Save student Excel files separated by batch (derived from USN like 1JS23... => 2023, 1JS22... => 2022)
    # We will write both a single combined file and batch-specific files
    df_students["batch_year"] = df_students["usn"].apply(lambda u: 2023 if "23" in u else (2022 if "22" in u else 2023))
    
    for batch, group in df_students.groupby("batch_year"):
        cols = group[["usn", "name", "email", "phone"]]
        cols.to_excel(f"scratch/students_enrollment_{batch}.xlsx", index=False)
        print(f"Saved scratch/students_enrollment_{batch}.xlsx with {len(group)} records")

    # 2. Fetch and generate Subjects
    print("Extracting subjects from semester tables...")
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'sem%';
    """)
    sem_tables = [r[0] for r in cur.fetchall()]
    
    semester_subjects = {} # semester -> set of (code, credits)
    
    for table in sem_tables:
        semester = table.split('_')[0].strip().lower() # e.g. "sem1"
        if semester not in semester_subjects:
            semester_subjects[semester] = set()
            
        # Get columns of the sem table
        cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{table}';
        """)
        cols = [r[0] for r in cur.fetchall()]
        
        # Look for _CREDITS columns
        credit_cols = [c for c in cols if c.endswith("_CREDITS") or c.endswith("_credits")]
        for c_col in credit_cols:
            subject_code = c_col.replace("_CREDITS", "").replace("_credits", "").strip().upper()
            if not subject_code:
                continue
            
            # Fetch credit value
            cur.execute(f'SELECT "{c_col}" FROM "{table}" WHERE "{c_col}" IS NOT NULL LIMIT 1;')
            row = cur.fetchone()
            credits_val = int(row[0]) if row and row[0] is not None else 3
            semester_subjects[semester].add((subject_code, credits_val))

    for semester, subjects_set in sorted(semester_subjects.items()):
        subjects_list = []
        for code, creds in sorted(subjects_set):
            subjects_list.append({
                "code": code,
                "name": get_subject_name(code),
                "credits": creds
            })

        df_subjects = pd.DataFrame(subjects_list)
        df_subjects.to_excel(f"scratch/subjects_{semester}.xlsx", index=False)
        print(f"Saved scratch/subjects_{semester}.xlsx with {len(df_subjects)} records")

    # 3. Fetch and generate Staff
    print("Generating staff...")
    cur.execute("SELECT name, email FROM teachers;")
    staff_data = cur.fetchall()
    df_staff = pd.DataFrame(staff_data, columns=["Name", "Email"])
    df_staff["Name"] = df_staff["Name"].str.strip()
    df_staff["Email"] = df_staff["Email"].str.strip()
    df_staff.to_excel("scratch/staff.xlsx", index=False)
    print(f"Saved scratch/staff.xlsx with {len(df_staff)} records")

    # 4. Fetch and generate Mentor Student Mapping
    print("Generating mentor student mappings...")
    cur.execute("""
        SELECT t.username AS "Mentor_Username", s.username AS "student_usn"
        FROM students s 
        JOIN teachers t ON s.mentor_id = t.mentor_id;
    """)
    mapping_data = cur.fetchall()
    df_mapping = pd.DataFrame(mapping_data, columns=["Mentor_Username", "student_usn"])
    df_mapping["Mentor_Username"] = df_mapping["Mentor_Username"].str.strip()
    df_mapping["student_usn"] = df_mapping["student_usn"].str.strip().str.upper()
    
    # Save mappings separated by student batch (2022 vs 2023)
    df_mapping["batch_year"] = df_mapping["student_usn"].apply(lambda u: 2023 if "23" in u else (2022 if "22" in u else 2023))
    for batch, group in df_mapping.groupby("batch_year"):
        cols = group[["Mentor_Username", "student_usn"]]
        cols.to_excel(f"scratch/mentor_mapping_{batch}.xlsx", index=False)
        print(f"Saved scratch/mentor_mapping_{batch}.xlsx with {len(group)} records")

    cur.close()
    conn.close()
    print("🎉 All Excel files generated successfully inside the scratch/ folder!")

if __name__ == "__main__":
    generate()
