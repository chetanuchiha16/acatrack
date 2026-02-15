import pandas as pd
from sqlalchemy import create_engine
from models.cloud_utils import download_excel_from_supabase
from models.paths import postgres_db_url
from logger_config import get_logger

logger = get_logger(__name__)

def convert_excel_to_postgres(excel_path: str, postgres_url: str, batch_year: int):
    """
    Convert Excel sheets to Postgres tables.
    Tables are suffixed with batch_year to keep batches separate.
    """
    xls = pd.ExcelFile(excel_path)
    engine = create_engine(postgres_url)

    for sheet_name in xls.sheet_names:
        logger.debug(f"Processing sheet: {sheet_name}")
        df = xls.parse(sheet_name, header=0)

        # Flatten multi-level headers
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join(map(str, col)).strip() for col in df.columns.values]
        else:
            df.columns = [str(col).strip() for col in df.columns]

        # Remove unnamed columns
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        # Convert numeric-like columns
        for col in df.columns:
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            if numeric_series.notna().sum() > len(df) // 2:
                df[col] = numeric_series.fillna(0).astype(int)

        # Use table prefix for batch separation
        table_name = f"{sheet_name}_{batch_year}".lower()
        df.to_sql(table_name, engine, if_exists='replace', index=False)
        logger.debug(f"Saved sheet '{sheet_name}' to Postgres table '{table_name}'")

    logger.debug("✅ All sheets processed for Postgres.")

# Usage
def prepare_data(batch_year: int):
    excel_supabase_folder = f"{batch_year}"
    excel_filename = f"result_list_{batch_year}.xlsx"
    logger.debug(f"Downloading Excel from Supabase: {excel_supabase_folder}/{excel_filename}")
    local_excel_path = download_excel_from_supabase(excel_filename, excel_supabase_folder)
    postgres_url = postgres_db_url
    convert_excel_to_postgres(local_excel_path, postgres_url, batch_year)
