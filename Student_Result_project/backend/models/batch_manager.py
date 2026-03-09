# models/batch_manager.py
from contextlib import contextmanager
from pathlib import Path

from app_init import create_app, db
from logger_config import get_logger
from models import University
from models.data_prep import prepare_data as prep_data
from models.fetch import SEMESTERS
from models.paths import postgres_db_url
from models.schema import StudentAuth  # Added to query distinct batches
import os
import sys

# Ensure the backend directory is in the path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
logger = get_logger(__name__)


class BatchManager:
    current_batch_year = None
    _apps = {}  # Cached Flask apps per batch
    _universities = {}  # Cached University instances

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent
        self.excel_dir = self.base_dir / "Outputs" / "ExcelData"
        self.excel_dir.mkdir(parents=True, exist_ok=True)

    def get_postgres_url(self, batch_year: int):
        return postgres_db_url

    def create_batch(self, batch_year: int):
        """Prepare Excel data and create tables in Postgres."""
        try:
            app = self.get_flask_app(batch_year)

            # CRITICAL FIX: Everything database-related must be inside the app context
            with app.app_context():
                logger.debug(f"[BatchManager] Creating tables for batch {batch_year}")
                db.create_all()  # 1. Create tables FIRST

                logger.debug(f"[BatchManager] Preparing data for batch {batch_year}")
                prep_data(batch_year=batch_year)  # 2. Insert data SECOND

            logger.debug(f"[BatchManager] ✅ Batch {batch_year} processed in Postgres")
        except Exception as e:
            import traceback

            logger.debug(f"[BatchManager] ❌ Failed to create batch {batch_year}: {e}")
            traceback.print_exc()
            raise

    def refresh_batch_data(self, batch_year: int):
        """Re-import Excel sheets to update Postgres tables."""
        try:
            app = self.get_flask_app(batch_year)

            # CRITICAL FIX: Moved inside app context
            with app.app_context():
                logger.debug(f"[BatchManager] Refreshing batch {batch_year}")
                prep_data(batch_year=batch_year)

            logger.debug(f"[BatchManager] ✅ Batch {batch_year} refreshed")
        except Exception as e:
            logger.debug(f"[BatchManager] ❌ Failed to refresh batch {batch_year}: {e}")
            raise

    def list_batches(self):
        """
        Return all batch years present in PostgreSQL.
        CRITICAL FIX: Now queries the normalized StudentAuth table instead of looking for dynamic tables.
        """
        try:
            # We just need a generic app context to query the DB
            app = self.get_flask_app(0)
            with app.app_context():
                # Query distinct batch years from the students table
                result = db.session.query(StudentAuth.batch_year).distinct().all()
                batch_years = [row[0] for row in result if row[0] is not None]
                return sorted(batch_years)
        except Exception as e:
            logger.debug(
                f"[BatchManager] Warning: Could not list batches, tables might not exist yet. Error: {e}"
            )
            return []

    def get_flask_app(self, batch_year: int):
        """Return a Flask app (cached) for this batch."""
        if batch_year not in self._apps:
            self._apps[batch_year] = create_app(batch_year=batch_year)
        return self._apps[batch_year]

    def get_db_for_batch(self, batch_year: int):
        """Return SQLAlchemy db and app context for transactions."""
        app = self.get_flask_app(batch_year)
        return db, app

    def set_current_batch(self, batch_year: int):
        self.current_batch_year = batch_year

    def get_university(self, batch_year: int):
        """Return a University object for this batch (cached)."""
        if batch_year not in self._universities:
            postgres_url = self.get_postgres_url(batch_year)
            uni = University(postgres_url=postgres_url, batch_year=batch_year)
            self._universities[batch_year] = uni
        return self._universities[batch_year]

    @contextmanager
    def session_scope(self, batch_year: int):
        """Provide a transactional scope for Postgres via Flask app context."""
        app = self.get_flask_app(batch_year)
        with app.app_context():
            yield db


# Global instance
bm = BatchManager()
