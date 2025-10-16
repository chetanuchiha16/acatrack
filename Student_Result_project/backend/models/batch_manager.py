# models/batch_manager.py
from pathlib import Path
from models.data_prep import prepare_data as prep_data
from app_init import create_app, db
from contextlib import contextmanager
from models.fetch import SEMESTERS
from models import University

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
        user = "chetan"
        password = "chetan"
        host = "localhost"
        port = 5433
        db_name = "Group_Project"
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"

    def create_batch(self, batch_year: int):
        """Prepare Excel data and create tables in Postgres."""
        try:
            print(f"[BatchManager] Preparing data for batch {batch_year}")
            prep_data(batch_year=batch_year)

            app = self.get_flask_app(batch_year)
            with app.app_context():
                print(f"[BatchManager] Creating tables for batch {batch_year}")
                db.create_all()

            print(f"[BatchManager] ✅ Batch {batch_year} processed in Postgres")
        except Exception as e:
            import traceback
            print(f"[BatchManager] ❌ Failed to create batch {batch_year}: {e}")
            traceback.print_exc()
            raise

    def refresh_batch_data(self, batch_year: int):
        """Re-import Excel sheets to update Postgres tables."""
        try:
            print(f"[BatchManager] Refreshing batch {batch_year}")
            prep_data(batch_year=batch_year)
            print(f"[BatchManager] ✅ Batch {batch_year} refreshed")
        except Exception as e:
            print(f"[BatchManager] ❌ Failed to refresh batch {batch_year}: {e}")
            raise

    def list_batches(self):
        """Return all batches for which Excel data exists."""
        batches = []
        for file in self.excel_dir.glob("*.xlsx"):
            try:
                year = int(file.stem.split("_")[-1])
                batches.append(year)
            except ValueError:
                continue
        return sorted(batches)

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
