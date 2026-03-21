"""
Tests for basic DB connectivity and StudentAuth queries.
Uses the in-memory SQLite fixture from conftest.py — no real credentials needed.
"""
from models import StudentAuth


def test_db_tables_created(app):
    """Ensure all tables are created without error."""
    with app.app_context():
        from extensions import db
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        assert len(tables) > 0, "Expected at least one table to be created"


def test_mentee_query_returns_empty_for_missing_mentor(app):
    """
    Querying mentees for a non-existent mentor should return an empty list,
    not raise an exception.
    """
    with app.app_context():
        mentees = StudentAuth.query.filter_by(mentor_id=1, batch_year=2023).all()
        assert isinstance(mentees, list)
        assert mentees == [], f"Expected no mentees, got: {mentees}"
