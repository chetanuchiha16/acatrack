"""
Test configuration for FastAPI test client.
"""

import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

# Force testing mode before any app imports
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///test.db"
os.environ.setdefault("FIREBASE_CRED_PATH", "dummy_path")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-jwt")
os.environ.setdefault("ADMIN_SECRET", "test-admin-secret")
os.environ.setdefault("A_EMAIL", "test@test.com")
os.environ.setdefault("EMAIL_PASS", "testpass")
os.environ.setdefault("C_EMAIL", "test@test.com")
os.environ.setdefault("DEFAULT_NUMBER", "0000000000")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from httpx import AsyncClient, ASGITransport


from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Sync engine for test setup (SQLite doesn't need async for tests)
test_engine = create_engine("sqlite:///test.db", echo=False)
TestSessionLocal = sessionmaker(bind=test_engine)

# Async engine for FastAPI
async_test_engine = create_async_engine("sqlite+aiosqlite:///test.db", echo=False)


@pytest.fixture(scope="session", autouse=True)
def mock_firebase():
    with patch("firebase_admin.credentials.Certificate"):
        with patch("firebase_admin.initialize_app"):
            yield


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    try:
        os.remove("test.db")
    except OSError:
        pass


@pytest.fixture(autouse=True)
def clean_db():
    """Clean all tables before each test instead of transaction rollback."""
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture
def db_session():
    """Provide a sync DB session for tests to arrange data, with auto-commit."""
    session = TestSessionLocal()
    yield session
    session.close()


@pytest.fixture
def mock_bm():
    """Mock BatchManager's async session_scope to use an AsyncSession."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def mock_session_scope(batch_year=None):
        async with AsyncSession(async_test_engine, expire_on_commit=False) as session:
            yield session

    # Override get_db for FastAPI
    async def override_get_db():
        async with AsyncSession(async_test_engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with patch(
        "services.batch_manager.bm.session_scope", side_effect=mock_session_scope
    ):
        with patch(
            "services.batch_manager.bm.list_batches",
            new_callable=AsyncMock,
            return_value=[2021, 2022, 2023],
        ):
            yield

    app.dependency_overrides.clear()


@pytest.fixture
def client(mock_bm):
    """Synchronous test client for FastAPI."""
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def async_client(mock_bm):
    """Async test client for FastAPI."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
