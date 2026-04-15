# backend/main.py
"""
FastAPI application entry-point.

Replaces the old Flask app.py + app_init.py
"""

from __future__ import annotations

import firebase_admin
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cache_config import init_cache
from database import create_tables, engine
from logger_config import get_logger
from settings import settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    # ---- Startup ----
    # Firebase
    cred_path = settings.firebase_cred_path
    if not cred_path:
        raise RuntimeError("FIREBASE_CRED_PATH not set!")
    if not firebase_admin._apps:
        from firebase_admin import credentials

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    logger.info("Firebase initialised")

    # Database tables
    await create_tables()
    logger.info("Database tables ensured")

    # Cache
    await init_cache()

    yield

    # ---- Shutdown ----
    await engine.dispose()
    logger.info("Database engine disposed")


app = FastAPI(
    title="AcaTrack API",
    version="2.0.0",
    lifespan=lifespan,
)

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
