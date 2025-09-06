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

    def create_batch(self, batch_year: int, excel_path: str):
        """Create a new batch DB from Excel."""
        # Prepare Excel into DB
        prep_data(batch_year=batch_year)
        print(f"[BatchManager] Batch {batch_year} DB created at: {self.get_db_path(batch_year)}")

    def list_batches(self):
        """List all available batch DBs."""
        batches = []
        for db_file in self.db_dir.glob("student_data_*.db"):
            year = int(db_file.stem.split("_")[-1])
            batches.append(year)
        return sorted(batches)

    def get_flask_app(self, batch_year: int):
        """Return a Flask app connected to the correct batch DB."""
        app = create_app(batch_year=batch_year)
        return app

    def get_db_for_batch(self, batch_year: int):
        """Return SQLAlchemy db bound to a specific batch (after app context)."""
        app = self.get_flask_app(batch_year)
        return db, app
    
    def set_current_batch(self, batch_year: int):
        self.current_batch_year = batch_year
        self.current_db_path = self.get_db_path(batch_year)
