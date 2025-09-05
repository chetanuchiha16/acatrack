import os
import pdfplumber
import pandas as pd

pdf_folder = r"C:\Users\CHEKI\Documents\Group-Projects\Student_Result_project\backend\vtu_scraper-main\pdfexcel"
excel_path = "result list project.xlsx"

# Step 1: Gather all unique subject codes across all PDFs
subject_codes = set()
for file in os.listdir(pdf_folder):
    if file.endswith(".pdf"):
        pdf_path = os.path.join(pdf_folder, file)
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() for page in pdf.pages)

        lines = text.splitlines()
        for line in lines:
            parts = line.split()
            if len(parts) >= 6 and (parts[0].isalpha() or parts[0][:2].isalpha()):
                code = parts[0]
                subject_codes.add(code)

subject_codes = sorted(subject_codes)

# Step 2: Build performance-focused columns
columns = ["student_usn", "student_name"]
for code in subject_codes:
    columns += [
        f"{code}_INTERNALS", f"{code}_EXTERNALS",
        f"{code}_TOTAL", f"{code}_RESULT"
    ]
columns += ["TOTAL_MARKS", "TOTAL_FAILED_SUBJECTS", "PERCENTAGE"]

# Step 3: Function to extract student data from PDF
def extract_from_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() for page in pdf.pages)

    student_data = {col: None for col in columns}

    # Extract USN and name
    try:
        student_data["student_usn"] = text.split("University Seat Number :")[1].split("\n")[0].strip()
    except IndexError:
        student_data["student_usn"] = None

    try:
        student_data["student_name"] = text.split("Student Name :")[1].split("\n")[0].strip()
    except IndexError:
        student_data["student_name"] = None

    # Extract semester
    try:
        sem = text.split("Semester :")[1].split("\n")[0].strip()
        student_data["SEMESTER"] = sem
    except IndexError:
        student_data["SEMESTER"] = "Unknown"

    total_marks = 0
    failed_subjects = 0

    lines = text.splitlines()
    for line in lines:
        parts = line.split()
        if len(parts) >= 7:
            code = parts[0]
            if code not in subject_codes:
                continue

            numbers = [int(p) for p in parts[1:] if p.isdigit()]
            if len(numbers) >= 3:
                internal, external, total = numbers[:3]
                result = parts[4] if len(parts) > 4 else ""

                student_data[f"{code}_INTERNALS"] = internal
                student_data[f"{code}_EXTERNALS"] = external
                student_data[f"{code}_TOTAL"] = total
                student_data[f"{code}_RESULT"] = result

                total_marks += total
                if result.lower() != "pass":
                    failed_subjects += 1

    student_data["TOTAL_MARKS"] = total_marks
    student_data["TOTAL_FAILED_SUBJECTS"] = failed_subjects
    student_data["PERCENTAGE"] = round(total_marks / (len(subject_codes) * 100) * 100, 2) if subject_codes else 0

    return student_data

# Step 4: Load existing Excel (if exists) with all sheets
existing_sheets = {}
if os.path.exists(excel_path):
    existing_excel = pd.ExcelFile(excel_path)
    for sheet in existing_excel.sheet_names:
        existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)

# Step 5: Process PDFs incrementally
for file in os.listdir(pdf_folder):
    if not file.endswith(".pdf"):
        continue

    pdf_path = os.path.join(pdf_folder, file)
    row = extract_from_pdf(pdf_path)

    # Skip PDFs without a USN
    if not row["student_usn"]:
        print(f"Skipping PDF '{file}' because USN was not found")
        continue

    sem_sheet = f"SEM{row.get('SEMESTER', 'Unknown')}"
    row.pop("SEMESTER", None)

    df_new = pd.DataFrame([row])

    # Ensure essential columns exist
    for essential_col in ["student_usn", "student_name"]:
        if essential_col not in df_new.columns:
            df_new[essential_col] = None

    df_new = df_new.dropna(axis=1, how="all")
    df_new.set_index("student_usn", inplace=True, drop=False)

    # Merge/update existing sheet or create new
    if sem_sheet in existing_sheets:
        df_existing = existing_sheets[sem_sheet]
        df_existing.set_index("student_usn", inplace=True, drop=False)
        df_existing.update(df_new)
        df_combined = pd.concat([df_existing, df_new[~df_new.index.isin(df_existing.index)]])
        df_combined.reset_index(drop=True, inplace=True)
    else:
        df_combined = df_new.reset_index(drop=True)

    existing_sheets[sem_sheet] = df_combined

# Step 6: Save all sheets to Excel
with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
    for sheet_name, df in existing_sheets.items():
        df.to_excel(writer, sheet_name=sheet_name, index=False)

print(f"Excel updated and saved at {excel_path}")
