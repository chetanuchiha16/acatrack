# backend/repositories/admin_repository.py
from models.schema import ExportCache

class AdminRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_export_cache_by_batch(self, batch_year: int) -> ExportCache:
        return self.db.query(ExportCache).filter_by(batch_year=batch_year).first()
