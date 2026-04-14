"""
Tests for basic DB connectivity and StudentAuth queries.
Uses the in-memory SQLite fixture from conftest.py — no real credentials needed.
"""

from models import StudentAuth

from sqlalchemy import select, inspect

def test_db_tables_created(db_session):
    """Ensure all tables are created without error."""
    # inspector = inspect(db.engine) -> we can inspect the test_engine from conftest directly,
    # or just inspect db_session.get_bind()
    inspector = inspect(db_session.get_bind())
    tables = inspector.get_table_names()
    assert len(tables) > 0, "Expected at least one table to be created"


def test_mentee_query_returns_empty_for_missing_mentor(db_session):
    """
    Querying mentees for a non-existent mentor should return an empty list,
    not raise an exception.
    """
    mentees = list(db_session.execute(
        select(StudentAuth).filter_by(mentor_id=1, batch_year=2023)
    ).scalars().all())
    assert isinstance(mentees, list)
    assert mentees == [], f"Expected no mentees, got: {mentees}"
