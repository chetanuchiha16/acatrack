# backend/repositories/parent_repository.py
from models.schema import ParentAuth

class ParentRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_auth_by_username(self, username: str) -> ParentAuth:
        return self.db.query(ParentAuth).filter_by(username=username).first()
