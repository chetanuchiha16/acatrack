# models/batch_manager.py
from pathlib import Path
from models.data_prep import prepare_data as prep_data
from app_init import create_app, db
from contextlib import contextmanager
from models.fetch import SEMESTERS
from models import University
class BatchManager:
    current_batch_year = None  # class-level variable
    current_db_path = None
    _apps = {}  # class variable shared across all instances
    _universities = {}
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent
        self.db_dir = self.base_dir / "Outputs" / "Databases"
        self.db_dir.mkdir(parents=True, exist_ok=True)

    def get_db_path(self, batch_year: int) -> str:
        return str(self.db_dir / f"student_data_{batch_year}.db")

    def create_batch(self, batch_year: int):
        try:
            print(f"[BatchManager] Preparing data for {batch_year}")
            prep_data(batch_year=batch_year)

            app = self.get_flask_app(batch_year)
            with app.app_context():
                print(f"[BatchManager] Creating tables for {batch_year}")
                db.create_all()

            print(f"[BatchManager] ✅ Batch {batch_year} created at {self.get_db_path(batch_year)}")

        except Exception as e:
            import traceback
            print(f"[BatchManager] ❌ Failed to create batch {batch_year}: {e}")
            traceback.print_exc()
            raise
    def refresh_batch_data(self, batch_year: int):
        """Re-run data prep to update DB with latest Excel changes."""
        try:
            print(f"[BatchManager] Refreshing batch {batch_year}")
            prep_data(batch_year=batch_year)  # re-import Excel
            print(f"[BatchManager] ✅ Batch {batch_year} refreshed")
        except Exception as e:
            print(f"[BatchManager] ❌ Failed to refresh batch {batch_year}: {e}")
            raise
    def list_batches(self):
        """List all available batch DBs."""
        batches = []
        for db_file in self.db_dir.glob("student_data_*.db"):
            try:
                year = int(db_file.stem.split("_")[-1])
                batches.append(year)
            except ValueError:
                print(f"[BatchManager] Skipping invalid DB file: {db_file.name}")
        print(batches)
        return sorted(batches)

    def get_flask_app(self, batch_year: int):
        """Return a Flask app connected to the correct batch DB (cached)."""
        if batch_year is None:
            raise ValueError("Batch year cannot be None when creating an app")
        if batch_year not in self._apps:
            self._apps[batch_year] = create_app(batch_year=batch_year)
        print(f"apps: {self._apps} from batch manager")
        return self._apps[batch_year]

    def get_db_for_batch(self, batch_year: int):
        """Return SQLAlchemy db bound to a specific batch (after app context)."""
        app = self.get_flask_app(batch_year)
        return db, app
    
    def set_current_batch(self, batch_year: int):
        self.current_batch_year = batch_year
        self.current_db_path = self.get_db_path(batch_year)

    def get_university(self, batch_year):
        if batch_year not in self._universities:
            db_file = self.get_db_path(batch_year)
            uni = University(db_path=db_file)
            for sem in SEMESTERS:
                try:
                    uni.add_students(selected_semester=sem)
                except:
                    continue
            self._universities[batch_year] = uni
        return self._universities[batch_year]

    @contextmanager
    def session_scope(self, batch_year: int):
        """Provide a transactional scope for a given batch DB."""
        app = self.get_flask_app(batch_year)
        with app.app_context():
            yield db


bm = BatchManager()