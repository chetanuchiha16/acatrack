from __future__ import annotations

# ruff: noqa: E402

# backend/main.py
"""
FastAPI application entry-point.

Replaces the old Flask app.py + app_init.py
"""

# Patch asyncio BaseEventLoop to automatically copy contextvars to the executor threads
import asyncio
import contextvars

_original_run_in_executor = asyncio.BaseEventLoop.run_in_executor


def _custom_run_in_executor(self, executor, func, *args, **kwargs):
    ctx = contextvars.copy_context()

    def wrapped(*w_args, **w_kwargs):
        return ctx.run(func, *w_args, **w_kwargs)

    return _original_run_in_executor(self, executor, wrapped, *args, **kwargs)


asyncio.BaseEventLoop.run_in_executor = _custom_run_in_executor


import firebase_admin
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from cache_config import init_cache
from database import create_tables, engine
from logger_config import get_logger
from settings import settings

import os
import time
import asyncio
from database import demo_session_var, demo_engines, Base
from seed_helpers import seed_mock_infra_and_subjects_async

logger = get_logger(__name__)


async def cleanup_old_sandboxes() -> None:
    """Background task to remove temp SQLite files older than 2 hours."""
    db_dir = "/tmp/acatrack_demos"
    while True:
        try:
            if os.path.exists(db_dir):
                now = time.time()
                for file in os.listdir(db_dir):
                    file_path = os.path.join(db_dir, file)
                    if (
                        os.path.isfile(file_path)
                        and os.path.getmtime(file_path) < now - 7200
                    ):
                        try:
                            if file.startswith("demo_") and file.endswith(".db"):
                                session_id = file[5:-3]
                                if session_id in demo_engines:
                                    engine_to_dispose = demo_engines.pop(session_id)
                                    await engine_to_dispose.dispose()
                            os.remove(file_path)
                            logger.info(
                                f"Cleaned up expired demo sandbox database: {file}"
                            )
                        except Exception as e:
                            logger.error(f"Error removing expired sandbox {file}: {e}")
        except Exception as e:
            logger.error(f"Error in sandbox cleanup task: {e}")
        await asyncio.sleep(3600)  # Check every hour


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    # ---- Startup ----
    # Firebase
    cred_path = settings.firebase_cred_path
    if not cred_path and not settings.testing:
        raise RuntimeError("FIREBASE_CRED_PATH not set!")

    if cred_path:
        from firebase_admin import credentials

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    logger.info("Firebase initialised")

    # Database tables
    await create_tables()
    logger.info("Database tables ensured")

    # Cache
    await init_cache()

    # Start background cleanup task
    app.state.cleanup_task = asyncio.create_task(cleanup_old_sandboxes())

    yield

    # ---- Shutdown ----
    # Cancel background cleanup task
    if hasattr(app.state, "cleanup_task"):
        app.state.cleanup_task.cancel()
        try:
            await app.state.cleanup_task
        except asyncio.CancelledError:
            pass

    # Dispose dynamic engines
    for engine_demo in list(demo_engines.values()):
        await engine_demo.dispose()

    await engine.dispose()
    logger.info("Database engine disposed")


app = FastAPI(
    title="AcaTrack API",
    version="2.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def demo_sandbox_middleware(request: Request, call_next):
    """
    Middleware that intercepts requests containing X-Demo-Session-ID.
    If present, routes standard database actions to a dynamic, visitor-isolated SQLite sandbox database,
    initializing and auto-seeding it on first touch.
    """
    from sqlalchemy.ext.asyncio import (
        create_async_engine,
        async_sessionmaker,
        AsyncSession,
    )

    session_id = request.headers.get("x-demo-session-id") or request.headers.get(
        "X-Demo-Session-ID"
    )
    if session_id:
        token = demo_session_var.set(session_id)
        db_path = f"/tmp/acatrack_demos/demo_{session_id}.db"

        # Ensure database is initialized and seeded before handling request
        if not os.path.exists(db_path):
            os.makedirs("/tmp/acatrack_demos", exist_ok=True)
            sqlite_url = f"sqlite+aiosqlite:///{db_path}"
            demo_engine = create_async_engine(sqlite_url)

            async with demo_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            demo_session_factory = async_sessionmaker(
                bind=demo_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
            async with demo_session_factory() as session:
                await seed_mock_infra_and_subjects_async(session)

            await demo_engine.dispose()

        try:
            response = await call_next(request)
            return response
        finally:
            demo_session_var.reset(token)
    else:
        return await call_next(request)


# ----- CORS -----
cors_origins = settings.cors_allowed_origins
origins = cors_origins.split(",") if cors_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Error handlers -----
from errors import register_exception_handlers  # noqa: E402

register_exception_handlers(app)

# ----- Routers -----
from routes import include_routers  # noqa: E402

include_routers(app)


# ----- Health -----
@app.get("/health")
async def health():
    return {"status": "ok"}
