import sqlite3
import pandas as pd
from models.config import db_path, excel_path

def convert_excel_to_sql(excel_path, db_path):
    # Load the Excel file
    xls = pd.ExcelFile(excel_path)
    conn = sqlite3.connect(db_path)

    for sheet_name in xls.sheet_names:
        print(f"Processing sheet: {sheet_name}")
        df = xls.parse(sheet_name, header = 0)

        # Flatten multi-level headers
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join(map(str, col)).strip() for col in df.columns.values]
        else:
            df.columns = [str(col).strip() for col in df.columns]

        # Remove unnamed columns
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        # Try converting numeric-like columns to numbers
        for col in df.columns:
            for col in df.columns:
                # Try converting only if it's meant to be numeric
                try:
                    # Attempt to convert to numeric only if most values are numeric
                    numeric_series = pd.to_numeric(df[col], errors='coerce')
                    if numeric_series.notna().sum() > len(df) // 2:  # if over 50% is numeric
                        df[col] = numeric_series.fillna(0).astype(int)
                except:
                    pass  # If it's totally not convertible, Hina skips it gently~



        # Write to SQL directly
        df.to_sql(sheet_name, conn, if_exists='replace', index=False)
        print(f"Saved sheet '{sheet_name}' to database.")

    conn.close()
    print("All sheets processed and saved.")

#Usage
convert_excel_to_sql(
    excel_path=excel_path,
    db_path=db_path
)
