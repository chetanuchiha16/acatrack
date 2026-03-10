# test_postgres_import.py
from logger_config import get_logger

logger = get_logger(__name__)


def run_import():
    """
    Main entry point for running the data preparation script.
    Loads environment variables and initializes the app context.
    """
    from dotenv import load_dotenv

    load_dotenv()

    from app_init import create_app
    from models.data_prep import prepare_data

    app = create_app()
    with app.app_context():
        batch_year = 2023
        try:
            prepare_data(batch_year)
            logger.debug("✅ Done importing Excel to Postgres for batch %s", batch_year)
        except Exception as e:
            logger.error(f"❌ Failed to import data: {e}", exc_info=True)


if __name__ == "__main__":
    run_import()
