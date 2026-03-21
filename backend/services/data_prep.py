import pandas as pd
from extensions import db  # Use the DB instance
from logger_config import get_logger
from utils.cloud import download_excel_from_supabase
from models.schema import AcademicResult, StudentAuth, Subject
from services.fetch_service import sem_subjects
from repositories.student_repository import StudentRepository

logger = get_logger(__name__)


def convert_excel_to_postgres(excel_path: str, batch_year: int):
    """
    Convert Excel sheets to normalized Postgres tables (3NF).
    Reads single-level columns and maps them to Student, Subject, and AcademicResult.
    """
    xls = pd.ExcelFile(excel_path)

    for sheet_name in xls.sheet_names:
        logger.debug(f"Processing sheet: {sheet_name}")

        # Usually sheet names are 'sem1', 'sem2'
        semester_name = str(sheet_name).lower().strip()

        # Parse with single header (Row 0)
        df = xls.parse(sheet_name, header=0)

        # Flatten columns just in case, though header=0 should be flat
        df.columns = [str(col).strip() for col in df.columns]

        logger.debug(f"Columns: {df.columns.tolist()[:20]}...")

        # Remove unnamed columns
        df = df.loc[:, ~df.columns.str.contains("^Unnamed", case=False)]

        # Identify USN and Name columns
        usn_col = next((c for c in df.columns if "usn" in c.lower()), None)
        name_col = next((c for c in df.columns if "name" in c.lower()), None)

        if not usn_col:
            logger.error(f"Could not find USN column in sheet {sheet_name}. Skipping.")
            continue

        # Identify subject columns and their metrics
        # Maps '21CS51' -> { 'ia': '21CS51_INTERNALS', 'see': '...', 'credits': '...' }
        subject_cols = {}

        # Iterate over columns to map them to subjects
        for col in df.columns:
            if col in [usn_col, name_col]:
                continue

            # Split from the right to separate Subject Code and Metric
            # Expecting format: SUBJECTCODE_METRIC (e.g., BCS301_INTERNALS)
            parts = col.rsplit("_", 1)

            if len(parts) == 2:
                subj_code = parts[0].strip()
                metric = parts[1].strip().upper()  # Normalize metric to UPPER

                # Sanitize Subject Code (remove known garbage if any remains)
                subj_code = subj_code.strip("_").strip()

                if not subj_code:
                    continue

                if len(subj_code) > 20:
                    logger.warning(
                        f"Skipping column {col} - subject code parsed as '{subj_code}' which is too long"
                    )
                    continue

                if subj_code not in subject_cols:
                    subject_cols[subj_code] = {}

                if "INTERNALS" in metric:
                    subject_cols[subj_code]["ia"] = col
                elif "EXTERNALS" in metric:
                    subject_cols[subj_code]["see"] = col
                elif "TOTAL" in metric:
                    subject_cols[subj_code]["total"] = col
                elif "CREDITS" in metric:
                    subject_cols[subj_code]["credits"] = col

        # Iterate over rows

        # --- Pre-fetch data to avoid N+1 queries ---
        usns_in_df = set()
        for _, row in df.iterrows():
            usn_val = str(row[usn_col]).strip()
            if usn_val and usn_val.lower() != "nan":
                usns_in_df.add(usn_val)

        student_repo = StudentRepository(db.session)

        existing_students = student_repo.get_auths_by_usns(list(usns_in_df))
        student_map = {s.usn: s for s in existing_students}

        subject_codes = list(subject_cols.keys())
        existing_subjects = student_repo.get_subjects_by_codes(subject_codes)
        subject_map = {s.subject_code: s for s in existing_subjects}

        student_ids = [s.id for s in existing_students]
        if student_ids and subject_codes:
            existing_results = (
                db.session.query(AcademicResult)
                .filter(
                    AcademicResult.student_id.in_(student_ids),
                    AcademicResult.subject_code.in_(subject_codes),
                )
                .all()
            )
        else:
            existing_results = []
        result_map = {(r.student_id, r.subject_code): r for r in existing_results}
        # ---------------------------------------------
        for _, row in df.iterrows():
            usn_val = str(row[usn_col]).strip()
            if not usn_val or usn_val.lower() == "nan":
                continue

            name_val = (
                str(row[name_col]).strip()
                if name_col and pd.notna(row[name_col])
                else "Unknown"
            )

            # 1. Get or Create Student
            student = student_map.get(usn_val)
            if not student:
                student = StudentAuth(usn=usn_val, name=name_val, batch_year=batch_year)
                db.session.add(student)
                db.session.flush()
                student_map[usn_val] = student

            # 2. Extract and Insert Academic Results / Update Subjects
            for subj_code, metrics in subject_cols.items():
                # Fetch Subject Name from mapping or default to code
                real_subject_name = sem_subjects.get(semester_name, {}).get(
                    subj_code, subj_code
                )

                # Get or Create Subject
                subject = subject_map.get(subj_code)
                if not subject:
                    subject = Subject(
                        subject_code=subj_code,
                        subject_name=real_subject_name,
                        semester=semester_name,
                        credits=0,  # Will update if credits column exists
                    )
                    db.session.add(subject)
                    db.session.flush()
                    subject_map[subj_code] = subject
                else:
                    # Update name if it was a default code before
                    if (
                        subject.subject_name == subj_code
                        and real_subject_name != subj_code
                    ):
                        subject.subject_name = real_subject_name

                # Extract Credits if available and update Subject
                credits_col = metrics.get("credits")
                if credits_col:
                    try:
                        credit_val = (
                            int(float(row[credits_col]))
                            if pd.notna(row[credits_col])
                            else 0
                        )
                        # Update subject credits if not set or if we found a non-zero value
                        if credit_val > 0:
                            subject.credits = credit_val
                    except ValueError, TypeError:
                        pass

                # Extract Marks
                ia_col = metrics.get("ia")
                see_col = metrics.get("see")
                total_col = metrics.get("total")

                # If this is purely a credit/metadata column set (no marks), we might skip result creation
                # But usually there are marks.

                if not (ia_col or see_col or total_col):
                    continue

                # Parse values
                try:
                    ia_marks = (
                        int(float(row[ia_col]))
                        if ia_col and pd.notna(row[ia_col])
                        else 0
                    )
                except ValueError, TypeError:
                    ia_marks = 0

                try:
                    see_marks = (
                        int(float(row[see_col]))
                        if see_col and pd.notna(row[see_col])
                        else 0
                    )
                except ValueError, TypeError:
                    see_marks = 0

                try:
                    total_marks = (
                        int(float(row[total_col]))
                        if total_col and pd.notna(row[total_col])
                        else (ia_marks + see_marks)
                    )
                except ValueError, TypeError:
                    total_marks = ia_marks + see_marks

                # Skip if no data for this subject for this student AND it's not a credit-only update
                # (We already updated credits above, so strict check on marks here)
                if ia_marks == 0 and see_marks == 0 and total_marks == 0:
                    continue

                # Get or Create Academic Result
                result = result_map.get((student.id, subj_code))
                if not result:
                    result = AcademicResult(
                        student_id=student.id,
                        subject_code=subj_code,
                        batch_year=batch_year,
                        ia_marks=ia_marks,
                        see_marks=see_marks,
                        total_marks=total_marks,
                    )
                    db.session.add(result)
                    result_map[(student.id, subj_code)] = result
                else:
                    result.ia_marks = ia_marks
                    result.see_marks = see_marks
                    result.total_marks = total_marks

        # Commit all inserts for this sheet
        db.session.commit()
        logger.debug(f"Saved sheet '{sheet_name}' to normalized tables.")

    logger.debug("✅ All sheets processed for Postgres.")


# Usage
def prepare_data(batch_year: int):
    excel_supabase_folder = f"{batch_year}"
    excel_filename = f"result_list_{batch_year}.xlsx"
    logger.debug(
        f"Downloading Excel from Supabase: {excel_supabase_folder}/{excel_filename}"
    )
    local_excel_path = download_excel_from_supabase(
        excel_filename, excel_supabase_folder
    )

    # Notice we no longer need the raw postgres_url, SQLAlchemy handles the connection!
    convert_excel_to_postgres(local_excel_path, batch_year)
