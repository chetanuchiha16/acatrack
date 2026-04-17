# backend/database.py
"""
Async SQLAlchemy engine, session factory, and FastAPI dependency.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from settings import settings

# Convert postgres:// → postgresql+asyncpg://
_raw_url = settings.database_url
if _raw_url.startswith("postgres://"):
    _async_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://"):
    _async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    _async_url = _raw_url

# For testing with SQLite we need aiosqlite
if _async_url.startswith("sqlite"):
    _async_url = _async_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
else:
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
    class_=AsyncSession,
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
