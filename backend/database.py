# backend/database.py
"""
Async SQLAlchemy engine, session factory, and FastAPI dependency.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
import contextvars
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from settings import settings

# Context variable to hold the active visitor's demo session ID
demo_session_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "demo_session_var", default=None
)
# Cache for dynamic engines pointing to temp SQLite files
demo_engines: dict[str, any] = {}


class RoutingAsyncSession(AsyncSession):
    """
    Subclass of AsyncSession that dynamically binds to a visitor-specific
    SQLite sandbox connection pool if a demo session ID is set in the context.
    """

    def __init__(self, *args, **kwargs):
        session_id = demo_session_var.get()
        if session_id:
            if session_id not in demo_engines:
                db_dir = "/tmp/acatrack_demos"
                os.makedirs(db_dir, exist_ok=True)
                db_path = f"{db_dir}/demo_{session_id}.db"
                sqlite_url = f"sqlite+aiosqlite:///{db_path}"
                demo_engines[session_id] = create_async_engine(sqlite_url)

            kwargs["bind"] = demo_engines[session_id]

        super().__init__(*args, **kwargs)


# Convert postgres:// → postgresql+asyncpg://
_raw_url = settings.database_url
if _raw_url.startswith("postgres://"):
    _async_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://"):
    _async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    _async_url = _raw_url

# For testing with SQLite we need aiosqlite
if _async_url.startswith("sqlite://"):
    _async_url = _async_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
elif not _async_url.startswith("sqlite"):
    from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

    parsed = urlparse(_async_url)
    query_params = dict(parse_qsl(parsed.query))
    if "sslmode" in query_params:
        query_params.pop("sslmode")
        _async_url = urlunparse(parsed._replace(query=urlencode(query_params)))

_engine_kwargs: dict = {}
if not _async_url.startswith("sqlite"):
    _engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

engine = create_async_engine(_async_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=RoutingAsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables (used at app startup)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
