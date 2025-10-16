# test_postgres_import.py
from models.data_prep import prepare_data  # or wherever your function is

if __name__ == "__main__":
    batch_year = 2023
    prepare_data(batch_year)
    print("✅ Done importing Excel to Postgres for batch", batch_year)
