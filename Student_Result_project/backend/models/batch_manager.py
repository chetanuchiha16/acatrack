# models/batch_manager.py
from pathlib import Path
from models.data_prep import prepare_data as prep_data
from app_init import create_app, db
from contextlib import contextmanager
from models.fetch import SEMESTERS
from models import University
from logger_config import get_logger
from models.paths import postgres_db_url

logger = get_logger(__name__)


class BatchManager:
    current_batch_year = None
    _apps = {}          # Cached Flask apps per batch
    _universities = {}  # Cached University instances

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent
        self.excel_dir = self.base_dir / "Outputs" / "ExcelData"
        self.excel_dir.mkdir(parents=True, exist_ok=True)

    def get_postgres_url(self, batch_year: int):
        """
        Return the Postgres connection string for this batch.
        You can use the same DB for all batches, 
        tables are distinguished by batch suffix.
        """
        # user = "chetan"
        # password = "chetan"
        # host = "localhost"
        # port = 5433
        # db_name = "Group_Project"
        # return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"
        return postgres_db_url

    def create_batch(self, batch_year: int):
        """Prepare Excel data and create tables in Postgres."""
        try:
            logger.debug(f"[BatchManager] Preparing data for batch {batch_year}")
            prep_data(batch_year=batch_year)

            app = self.get_flask_app(batch_year)
            with app.app_context():
                logger.debug(f"[BatchManager] Creating tables for batch {batch_year}")
                db.create_all()

            logger.debug(f"[BatchManager] ✅ Batch {batch_year} processed in Postgres")
        except Exception as e:
            import traceback
            logger.debug(f"[BatchManager] ❌ Failed to create batch {batch_year}: {e}")
            traceback.print_exc()
            raise

    def refresh_batch_data(self, batch_year: int):
        """Re-import Excel sheets to update Postgres tables."""
        try:
            logger.debug(f"[BatchManager] Refreshing batch {batch_year}")
            prep_data(batch_year=batch_year)
            logger.debug(f"[BatchManager] ✅ Batch {batch_year} refreshed")
        except Exception as e:
            logger.debug(f"[BatchManager] ❌ Failed to refresh batch {batch_year}: {e}")
            raise

    def list_batches(self):
        """
        Return all batch years present in PostgreSQL based on table names.
        Looks for tables like sem1_2022, sem2_2022, etc.
        """
        postgres_url = self.get_postgres_url(0)  # batch_year is irrelevant here
        from sqlalchemy import create_engine, text

        engine = create_engine(postgres_url)
        query = text(r"""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            AND table_type='BASE TABLE'
            AND table_name ~* '^sem[1-6]_\d{4}$'
        """)
        with engine.connect() as conn:
            result = conn.execute(query).fetchall()

        # Extract batch years
        batch_years = set()
        for (table_name,) in result:
            try:
                year = int(table_name.split("_")[-1])
                batch_years.add(year)
            except ValueError:
                continue

        return sorted(batch_years)

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
            for sem in SEMESTERS:
                try:
                    uni.add_students(selected_semester=sem)
                except Exception:
                    continue
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
