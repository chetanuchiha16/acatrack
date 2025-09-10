import os
import re
import io
import pdfplumber
import pandas as pd
import fitz  # PyMuPDF
import pytesseract
from pathlib import Path
from PIL import Image
from .paths import excel_dir
import glob
import shutil
import time
# ---------------- CONFIG ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pdf_folder = excel_dir
# excel_path = pdf_folder / "result list project.xlsx"

# Semester-wise subject credits mapping
sem_credits = {
    "SEM1": {
        "BMATS101": 3,
        "BCHES102": 4,
        "BCEDK103": 3,
        "BENGK106": 1,
        "BICOK107": 1,
        "BIDTK158": 1,
        "BESCK104A": 3,
        "BETCK105H": 3
    },
    "SEM2": {
        "BMAT201": 4,
        "BPHYS202": 4,
        "BPOPS203": 3,
        "BPWSK206": 1,
        "BKSKK207": 1,
        "BKBKK207": 1,
        "BSFHK258": 1,
        "BPLCK205B": 3,
        "BESCK204C": 3
    },
    "SEM3": {
        "BCS301": 3,
        "BCS302": 3,
        "BCS303": 3,
        "BCS304": 3,
        "BCSL305": 1,
        "BSCK307": 1,
        "BNSK359": 0,
        "BCS306A": 4,
        "BCS358D": 0
    },
    "SEM4": {
        "BCS401": 3,
        "BCS402": 3,
        "BCS403": 4,
        "BCSL404": 1,
        "BBOC407": 1,
        "BUHK408": 1,
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": 0,
        "BCS405B": 3,
        "BCSL456D": 1
    },
    "SEM5": {
        "BCS501": 3,
        "BCS502": 3,
        "BCS503": 3,
        "BCSL504": 1,
        "BAI515A": 4,
        "BCS515B": 4,
        "BCS515C": 3,
        "BCS515D": 3,
        "BAIL504": 1,
        "BRMK557": 3,
        "BES508": 0,
        "BCS586": 2,
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": 0
    },
    "SEM6": {},
    "SEM7": {},
    "SEM8": {}
}

# ---------------- OCR UTILS ----------------
def extract_text_with_ocr(pdf_path):
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text += pytesseract.image_to_string(img)
    return text

def get_pdf_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    if not text.strip():
        print(f"⚠️ Using OCR for {os.path.basename(pdf_path)}")
        text = extract_text_with_ocr(pdf_path)
    return text

# ---------------- SUBJECT CODE SCAN ----------------
def scan_subject_codes(pdf_folder=pdf_folder):
    subject_codes = set()
    all_valid_codes = {code for sem in sem_credits.values() for code in sem.keys()}
    for file in os.listdir(pdf_folder):
        if file.endswith(".pdf"):
            pdf_path = os.path.join(pdf_folder, file)
            text = get_pdf_text(pdf_path)
            for line in text.splitlines():
                parts = line.split()
                if parts and parts[0] in all_valid_codes:
                    subject_codes.add(parts[0])
    return sorted(subject_codes)

# ---------------- PDF DATA EXTRACTION ----------------
def extract_from_pdf(pdf_path, subject_codes, columns):
    text = get_pdf_text(pdf_path)
    student_data = {col: None for col in columns}

    # Extract USN
    match = re.search(r"(University Seat Number\s*:|USN\s*:)\s*(\S+)", text, re.IGNORECASE)
    student_data["student_usn"] = match.group(2).strip() if match else None

    # Extract Name
    match = re.search(r"Student Name\s*:\s*(.+)", text, re.IGNORECASE)
    student_data["student_name"] = match.group(1).strip() if match else None

    # Extract Semester
    match = re.search(r"Semester\s*:\s*(\S+)", text, re.IGNORECASE)
    semester = match.group(1).strip() if match else "Unknown"
    student_data["SEMESTER"] = semester

    total_marks = 0
    failed_subjects = 0
    total_credits = 0

    for line in text.splitlines():
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
                

                # Credits
                credit_val = sem_credits.get(f"SEM{semester}", {}).get(code, 0)
                student_data[f"{code}_CREDITS"] = credit_val

                total_marks += total
                if result.lower() == "pass":
                    total_credits += credit_val
                else:
                    failed_subjects += 1

    return student_data

# ---------------- PROCESS PDFs ----------------
def process_pdfs(excel_filename, pdf_folder=pdf_folder):
    subject_codes = scan_subject_codes(pdf_folder)
    excel_path = pdf_folder / excel_filename  # dynamically set Excel path
    # build columns
    columns = ["student_usn", "student_name"]
    for code in subject_codes:
        columns += [
            f"{code}_INTERNALS", f"{code}_EXTERNALS"
            , f"{code}_CREDITS"
        ]

    # load existing Excel if present
    existing_sheets = {}
    if os.path.exists(excel_path):
        existing_excel = pd.ExcelFile(excel_path)
        for sheet in existing_excel.sheet_names:
            existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)

    for file in os.listdir(pdf_folder):
        if not file.endswith(".pdf"):
            continue

        pdf_path = os.path.join(pdf_folder, file)
        row = extract_from_pdf(pdf_path, subject_codes, columns)

        if not row["student_usn"]:
            print(f"⚠️ Skipping PDF '{file}' because USN was not found")
            continue

        sem_sheet = f"SEM{row.get('SEMESTER', 'Unknown')}"
        row.pop("SEMESTER", None)

        df_new = pd.DataFrame([row])
        df_new = df_new.dropna(axis=1, how="all")
        df_new.set_index("student_usn", inplace=True, drop=False)

        if sem_sheet in existing_sheets:
            df_existing = existing_sheets[sem_sheet]
            df_existing.set_index("student_usn", inplace=True, drop=False)
            df_existing.update(df_new)
            df_combined = pd.concat([df_existing, df_new[~df_new.index.isin(df_existing.index)]])
            df_combined.reset_index(drop=True, inplace=True)
        else:
            df_combined = df_new.reset_index(drop=True)

        existing_sheets[sem_sheet] = df_combined

    with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
        for sheet_name, df in existing_sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    return excel_path


def process_single_pdf(pdf_path, excel_path):
    # Scan subject codes (optional: reuse previous scan for speed)
    subject_codes = scan_subject_codes(os.path.dirname(pdf_path))
    
    # Build columns same way as in process_pdfs
    columns = ["student_usn", "student_name"]
    for code in subject_codes:
        columns += [
            f"{code}_INTERNALS", f"{code}_EXTERNALS",
            f"{code}_CREDITS"
        ]

    # Extract data from the single PDF
    row = extract_from_pdf(pdf_path, subject_codes, columns)
    if not row["student_usn"]:
        print(f"⚠️ Skipping PDF '{os.path.basename(pdf_path)}' because USN was not found")
        return

    sem_sheet = f"SEM{row.get('SEMESTER', 'Unknown')}"
    row.pop("SEMESTER", None)
    df_new = pd.DataFrame([row]).set_index("student_usn", drop=False)

    # Load existing Excel
    existing_sheets = {}
    if os.path.exists(excel_path):
        existing_excel = pd.ExcelFile(excel_path)
        for sheet in existing_excel.sheet_names:
            df = pd.read_excel(excel_path, sheet_name=sheet)
            df.set_index("student_usn", drop=False, inplace=True)
            existing_sheets[sheet] = df

    # Update the sheet
    if sem_sheet in existing_sheets:
        df_existing = existing_sheets[sem_sheet]
        df_existing.update(df_new)
        df_combined = pd.concat([df_existing, df_new[~df_new.index.isin(df_existing.index)]])
        existing_sheets[sem_sheet] = df_combined
    else:
        existing_sheets[sem_sheet] = df_new

    # Save back to Excel
    with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
        for sheet_name, df in existing_sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"✅ Excel updated at {excel_path} for {row['student_usn']}")



def wait_and_rename_pdf(download_dir, usn, timeout=10):
    # Wait for a new PDF to appear in download_dir
    end_time = time.time() + timeout
    pdf_file = None
    while time.time() < end_time:
        pdfs = glob.glob(os.path.join(download_dir, "*.pdf"))
        if pdfs:
            pdf_file = max(pdfs, key=os.path.getctime)  # newest file
            break
        time.sleep(0.5)

    if pdf_file:
        new_path = os.path.join(download_dir, f"{usn}.pdf")
        shutil.move(pdf_file, new_path)
        return new_path
    else:
        raise FileNotFoundError("PDF download failed or took too long")