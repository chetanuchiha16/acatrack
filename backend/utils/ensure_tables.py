from logger_config import get_logger
from services.batch_manager import bm

from backend.models.schema import db

logger = get_logger(__name__)


def ensure_tables():
    for year, app in bm.apps.items():
        with app.app_context():
            db.create_all()
            logger.debug(f"Ensured tables for batch {year}")


if __name__ == "__main__":
    ensure_tables()
