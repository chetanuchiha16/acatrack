import pandas as pd
from extensions import db  # Use the DB instance
from logger_config import get_logger
from models.cloud_utils import download_excel_from_supabase
from models.schema import AcademicResult, StudentAuth, Subject

logger = get_logger(__name__)


def convert_excel_to_postgres(excel_path: str, batch_year: int):
    """
    Convert Excel sheets to normalized Postgres tables (3NF).
    Reads multi-level columns and maps them to Student, Subject, and AcademicResult.
    """
    xls = pd.ExcelFile(excel_path)

    for sheet_name in xls.sheet_names:
        logger.debug(f"Processing sheet: {sheet_name}")

        # Usually sheet names are 'sem1', 'sem2'
        semester_name = str(sheet_name).lower().strip()

        # Parse with multi-index to capture [Subject_Code] -> [IA, SEE, Total]
        df = xls.parse(sheet_name, header=[0, 1])

        # Flatten multi-level headers: ('21CS51', 'IA') -> '21CS51_IA'
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ["_".join(map(str, col)).strip() for col in df.columns.values]
        else:
            df.columns = [str(col).strip() for col in df.columns]

        # Remove unnamed columns
        df = df.loc[:, ~df.columns.str.contains("^Unnamed", case=False)]

        # Identify USN and Name columns
        usn_col = next((c for c in df.columns if "usn" in c.lower()), None)
        name_col = next((c for c in df.columns if "name" in c.lower()), None)

        if not usn_col:
            logger.error(f"Could not find USN column in sheet {sheet_name}. Skipping.")
            continue

        # Identify subject columns and their metrics
        # Maps '21CS51_IA' -> subject_cols['21CS51']['ia'] = '21CS51_IA'
        subject_cols = {}
        for col in df.columns:
            if col in [usn_col, name_col]:
                continue

            # Split from the right to separate Subject Code and Metric
            parts = col.rsplit("_", 1)
            if len(parts) == 2:
                subj_code = parts[0].strip()
                metric = parts[1].strip().lower()

                
                # Cleanup subject code from garbage headers
                if "INTERNALS" in subj_code:
                    subj_code = subj_code.split("INTERNALS")[0]
                if "Unnamed" in subj_code:
                    subj_code = subj_code.split("Unnamed")[0]
                
                subj_code = subj_code.strip("_").strip()
                
                if not subj_code:
                    continue
                    
                if len(subj_code) > 20:
                    logger.warning(f"Skipping column {col} - subject code parsed as '{subj_code}' which is too long")
                    continue

                if subj_code not in subject_cols:
                    subject_cols[subj_code] = {}
                subject_cols[subj_code][metric] = col

        # Iterate over rows
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
            student = StudentAuth.query.filter_by(usn=usn_val).first()
            if not student:
                student = StudentAuth(usn=usn_val, name=name_val, batch_year=batch_year)
                db.session.add(student)
                db.session.flush()  # Flush to get student.id immediately

            # 2. Extract and Insert Academic Results
            for subj_code, metrics in subject_cols.items():
                # Get or Create Subject
                subject = Subject.query.filter_by(subject_code=subj_code).first()
                if not subject:
                    subject = Subject(
                        subject_code=subj_code,
                        subject_name=subj_code,  # Default name to code until updated
                        semester=semester_name,
                        credits=0,
                    )
                    db.session.add(subject)
                    db.session.flush()

                # Extract Marks
                ia_col = metrics.get("ia")
                see_col = metrics.get("see")
                total_col = metrics.get("total")

                # Parse values (Handles 'ABS', Strings, or floats by defaulting to 0)
                try:
                    ia_marks = (
                        int(float(row[ia_col]))
                        if ia_col and pd.notna(row[ia_col])
                        else 0
                    )
                except (ValueError, TypeError):
                    ia_marks = 0

                try:
                    see_marks = (
                        int(float(row[see_col]))
                        if see_col and pd.notna(row[see_col])
                        else 0
                    )
                except (ValueError, TypeError):
                    see_marks = 0

                try:
                    total_marks = (
                        int(float(row[total_col]))
                        if total_col and pd.notna(row[total_col])
                        else (ia_marks + see_marks)
                    )
                except (ValueError, TypeError):
                    total_marks = ia_marks + see_marks

                # Skip if no data for this subject for this student
                if ia_marks == 0 and see_marks == 0 and total_marks == 0:
                    continue

                # Get or Create Academic Result
                result = AcademicResult.query.filter_by(
                    student_id=student.id, subject_code=subj_code
                ).first()
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
                else:
                    # Update existing if processing duplicate/updated sheet
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
