import glob
import io
import os
import platform
import re
import shutil
import tempfile
import time
from pathlib import Path
from functools import lru_cache

import fitz  # PyMuPDF
import pandas as pd
import pdfplumber
import pytesseract
from logger_config import get_logger

# Import your supabase upload helper
from utils.cloud import upload_excel_to_supabase
from PIL import Image

# ── Rust high-performance PDF engine (falls back gracefully if not compiled) ──
try:
    import acatrack_rust

    RUST_ENGINE_AVAILABLE = True
except ImportError:
    RUST_ENGINE_AVAILABLE = False

logger = get_logger(__name__)

# ---------------- CONFIG ----------------

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
else:
    pytesseract.pytesseract.tesseract_cmd = "tesseract"

# Semester-wise subject credits mapping
sem_credits = {
    "sem1": {
        "BMATS101": 3,
        "BCHES102": 4,
        "BCEDK103": 3,
        "BENGK106": 1,
        "BICOK107": 1,
        "BIDTK158": 1,
        "BESCK104A": 3,
        "BETCK105H": 3,
        "BPLCK105B": 3,
        "BESCK104C": 3,
    },
    "sem2": {
        "BMAT201": 4,
        "BMATS201": 4,
        "BPHYS202": 4,
        "BPOPS203": 3,
        "BPWSK206": 1,
        "BKSKK207": 1,
        "BKBKK207": 1,
        "BSFHK258": 1,
        "BPLCK205B": 3,
        "BESCK204C": 3,
        "BESCK204D": 3,
        "BETCK205H": 3,
    },
    "sem3": {
        "BCS301": 3,
        "BCS302": 3,
        "BCS303": 3,
        "BCS304": 3,
        "BCSL305": 1,
        "BSCK307": 1,
        "BNSK359": 0,
        "BCS306A": 4,
        "BCS358D": 1,
    },
    "sem4": {
        "BCS401": 3,
        "BCS402": 3,
        "BCS403": 4,
        "BCSL404": 1,
        "BBOC407": 1,
        "BUHK408": 1,
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": 0,
        "BCS405B": 3,
        "BCSL456D": 1,
    },
    "sem5": {
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
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": 0,
    },
    "sem6": {},
    "sem7": {},
    "sem8": {},
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


@lru_cache(maxsize=256)
def get_pdf_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    if not text.strip():
        logger.debug(f"⚠️ Using OCR for {os.path.basename(pdf_path)}")
        text = extract_text_with_ocr(pdf_path)
    return text


# ---------------- SUBJECT CODE SCAN ----------------
def scan_subject_codes(pdf_folder):
    subject_codes = set()
    all_valid_codes = {code for sem in sem_credits.values() for code in sem.keys()}
    pdf_files = [f for f in os.listdir(pdf_folder) if f.endswith(".pdf")]
    # Every student in a batch has the exact same subjects, so scanning 3 PDFs is more than enough
    for file in pdf_files[:3]:
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
    match = re.search(
        r"(University Seat Number\s*:|USN\s*:)\s*(\S+)", text, re.IGNORECASE
    )
    student_data["student_usn"] = match.group(2).strip() if match else None

    # Extract Name
    match = re.search(r"Student Name\s*:\s*(.+)", text, re.IGNORECASE)
    student_data["student_name"] = match.group(1).strip() if match else None

    # Extract Semester
    match = re.search(r"Semester\s*:\s*(\S+)", text, re.IGNORECASE)
    semester = match.group(1).strip() if match else "Unknown"
    student_data["SEMESTER"] = semester

    total_marks, failed_subjects, total_credits = 0, 0, 0

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
                credit_val = sem_credits.get(f"sem{semester}", {}).get(code, 0)
                student_data[f"{code}_CREDITS"] = credit_val

                total_marks += total
                if result.lower() == "pass":
                    total_credits += credit_val
                else:
                    failed_subjects += 1

    return student_data


# ---------------- PROCESS PDFs ----------------
def process_pdfs(
    excel_filename,
    pdf_folder,
    supabase_folder=None,
    progress_callback=None,
    parse_only=False,
    parsed_rows=None,
):
    t_start = time.perf_counter()
    excel_path = Path(tempfile.gettempdir()) / f"{excel_filename}"  # temp path

    # load existing Excel if present
    existing_sheets = {}
    if not parse_only and os.path.exists(excel_path):
        existing_excel = pd.ExcelFile(excel_path)
        for sheet in existing_excel.sheet_names:
            existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)

    if parsed_rows is not None:
        rows = parsed_rows
        subject_codes = scan_subject_codes(pdf_folder)
    else:
        subject_codes = scan_subject_codes(pdf_folder)
        pdf_files = [f for f in os.listdir(pdf_folder) if f.endswith(".pdf")]
        total_pdfs = len(pdf_files)
        pdf_paths = [os.path.join(pdf_folder, f) for f in pdf_files]

        # ── Fast path: Rust parallel engine ───────────────────────────────────────
        if RUST_ENGINE_AVAILABLE:
            logger.info(f"🦀 Using Rust parallel engine for {total_pdfs} PDFs...")
            t_rust_start = time.perf_counter()

            raw_rows = acatrack_rust.parse_pdfs_parallel(pdf_paths, subject_codes)

            elapsed = time.perf_counter() - t_rust_start
            logger.info(
                f"🎉 Rust engine parsed {total_pdfs} PDFs in {elapsed:.3f}s "
                f"({elapsed / total_pdfs:.4f}s per PDF)"
            )

            rows = [r for r in raw_rows if r is not None]

            # Signal 100% progress immediately after Rust finishes
            if progress_callback:
                try:
                    progress_callback(total_pdfs, total_pdfs)
                except Exception as cb_err:
                    logger.warning(f"Progress callback failed: {cb_err}")

        # ── Slow path: legacy Python sequential engine (fallback) ─────────────────
        else:
            logger.warning("⚠️ Rust engine not available — falling back to Python parser")
            columns = ["student_usn", "student_name"]
            for code in subject_codes:
                columns += [f"{code}_INTERNALS", f"{code}_EXTERNALS", f"{code}_CREDITS"]

            rows = []
            for idx, (file, pdf_path) in enumerate(zip(pdf_files, pdf_paths)):
                try:
                    row = extract_from_pdf(pdf_path, subject_codes, columns)
                    rows.append(row)
                except Exception as parse_err:
                    logger.error(f"❌ Failed to parse PDF '{file}': {parse_err}")

                if progress_callback:
                    try:
                        progress_callback(idx + 1, total_pdfs)
                    except Exception as cb_err:
                        logger.warning(f"Progress callback failed: {cb_err}")

    if parse_only:
        parse_duration = time.perf_counter() - t_start
        return None, parse_duration, rows

    # ── Shared: merge all rows into per-semester Excel sheets ─────────────────
    for row in rows:
        if not row.get("student_usn"):
            continue

        sem_sheet = f"sem{row.get('SEMESTER', 'Unknown')}"
        row_clean = {k: v for k, v in row.items() if k != "SEMESTER"}

        # Inject credits column from the sem_credits lookup table
        semester_key = f"sem{row.get('SEMESTER', '')}"
        for code in subject_codes:
            credit_val = sem_credits.get(semester_key, {}).get(code, 0)
            row_clean[f"{code}_CREDITS"] = credit_val

        df_new = (
            pd.DataFrame([row_clean])
            .dropna(axis=1, how="all")
            .set_index("student_usn", drop=False)
        )

        if sem_sheet in existing_sheets:
            df_existing = existing_sheets[sem_sheet].set_index(
                "student_usn", drop=False
            )
            df_existing.update(df_new)
            df_combined = pd.concat(
                [df_existing, df_new[~df_new.index.isin(df_existing.index)]]
            )
            df_combined.reset_index(drop=True, inplace=True)
        else:
            df_combined = df_new.reset_index(drop=True)

        existing_sheets[sem_sheet] = df_combined

    with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
        for sheet_name, df in existing_sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    parse_duration = time.perf_counter() - t_start

    # Upload result to Supabase and return public URL
    if not supabase_folder:
        supabase_folder = (
            Path(pdf_folder).name if hasattr(pdf_folder, "name") else str(pdf_folder)
        )
    try:
        excel_url = upload_excel_to_supabase(
            str(excel_path), excel_filename, supabase_folder
        )
        logger.debug(f"Excel uploaded to Supabase: {excel_url}")
        return excel_url, parse_duration, rows
    except Exception as e:
        logger.error(f"Excel upload failed: {e}")
        return None, parse_duration, rows


def process_single_pdf(pdf_path, excel_path):
    subject_codes = scan_subject_codes(os.path.dirname(pdf_path))
    columns = ["student_usn", "student_name"]
    for code in subject_codes:
        columns += [f"{code}_INTERNALS", f"{code}_EXTERNALS", f"{code}_CREDITS"]

    row = extract_from_pdf(pdf_path, subject_codes, columns)
    if not row["student_usn"]:
        logger.debug(
            f"⚠️ Skipping PDF '{os.path.basename(pdf_path)}' because USN was not found"
        )
        return

    sem_sheet = f"sem{row.get('SEMESTER', 'Unknown')}"
    row.pop("SEMESTER", None)
    df_new = pd.DataFrame([row]).set_index("student_usn", drop=False)

    existing_sheets = {}
    if os.path.exists(excel_path):
        existing_excel = pd.ExcelFile(excel_path)
        for sheet in existing_excel.sheet_names:
            df = pd.read_excel(excel_path, sheet_name=sheet)
            df.set_index("student_usn", drop=False, inplace=True)
            existing_sheets[sheet] = df

    if sem_sheet in existing_sheets:
        df_existing = existing_sheets[sem_sheet]
        df_existing.update(df_new)
        df_combined = pd.concat(
            [df_existing, df_new[~df_new.index.isin(df_existing.index)]]
        )
        existing_sheets[sem_sheet] = df_combined
    else:
        existing_sheets[sem_sheet] = df_new

    with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
        for sheet_name, df in existing_sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    logger.debug(f"✅ Excel updated at {excel_path} for {row['student_usn']}")


def wait_and_rename_pdf(download_dir, usn, timeout=10):
    end_time = time.time() + timeout
    pdf_file = None
    while time.time() < end_time:
        pdfs = glob.glob(os.path.join(download_dir, "*.pdf"))
        if pdfs:
            pdf_file = max(pdfs, key=os.path.getctime)
            break
        time.sleep(0.5)
    if pdf_file:
        new_path = os.path.join(download_dir, f"{usn}.pdf")
        shutil.move(pdf_file, new_path)
        return new_path
    else:
        raise FileNotFoundError("PDF download failed or took too long")
