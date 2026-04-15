# services/batch_manager.py
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from collections.abc import AsyncGenerator
import os
import sys

from database import AsyncSessionLocal
from logger_config import get_logger
from models.schema import StudentAuth
from sqlalchemy import select, distinct

# Ensure the backend directory is in the path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
logger = get_logger(__name__)


class BatchManager:
    current_batch_year: int | None = None

    def __init__(self) -> None:
        self.base_dir = Path(__file__).resolve().parent.parent
        self.excel_dir = self.base_dir / "Outputs" / "ExcelData"
        self.excel_dir.mkdir(parents=True, exist_ok=True)

    async def create_batch(self, batch_year: int) -> None:
        """Prepare Excel data and create tables in Postgres."""
        from database import create_tables

        try:
            await create_tables()
            logger.debug(f"[BatchManager] Creating tables for batch {batch_year}")

            from services.data_prep import prepare_data as prep_data

            # data_prep is synchronous — run it in the default executor
            import asyncio

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, prep_data, batch_year)

            logger.debug(f"[BatchManager] ✅ Batch {batch_year} processed in Postgres")
        except Exception as e:
            import traceback

            logger.error(f"[BatchManager] ❌ Failed to create batch {batch_year}: {e}")
            traceback.print_exc()
            raise

    async def refresh_batch_data(self, batch_year: int) -> None:
        """Re-import Excel sheets to update Postgres tables."""
        try:
            from services.data_prep import prepare_data as prep_data
            import asyncio

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, prep_data, batch_year)
            logger.debug(f"[BatchManager] ✅ Batch {batch_year} refreshed")
        except Exception as e:
            logger.error(f"[BatchManager] ❌ Failed to refresh batch {batch_year}: {e}")
            raise

    async def list_batches(self) -> list[int]:
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(distinct(StudentAuth.batch_year)))
                batch_years = [row[0] for row in result.all() if row[0] is not None]
                return sorted(batch_years)
        except Exception as e:
            logger.warning(
                f"[BatchManager] Could not list batches (tables might not exist yet): {e}"
            )
            return []

    def set_current_batch(self, batch_year: int) -> None:
        self.current_batch_year = batch_year

    @asynccontextmanager
    async def session_scope(self, batch_year: int) -> AsyncGenerator:
        """Provide a transactional scope for Postgres."""
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# Global instance
bm = BatchManager()
