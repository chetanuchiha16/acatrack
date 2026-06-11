# test_postgres_import.py
from models.data_prep import prepare_data  # or wherever your function is
from logger_config import get_logger

logger = get_logger(__name__)


if __name__ == "__main__":
    batch_year = 2023
    prepare_data(batch_year)
    logger.debug("✅ Done importing Excel to Postgres for batch", batch_year)
