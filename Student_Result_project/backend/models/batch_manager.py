# models/batch_manager.py
from pathlib import Path
from models.data_prep import prepare_data as prep_data
from app_init import create_app, db

class BatchManager:
    current_batch_year = None  # class-level variable
    current_db_path = None
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
        if batch_year not in self._apps:
            self._apps[batch_year] = create_app(batch_year=batch_year)
        return self._apps[batch_year]

    def get_db_for_batch(self, batch_year: int):
        """Return SQLAlchemy db bound to a specific batch (after app context)."""
        app = self.get_flask_app(batch_year)
        return db, app
    
    def set_current_batch(self, batch_year: int):
        self.current_batch_year = batch_year
        self.current_db_path = self.get_db_path(batch_year)
