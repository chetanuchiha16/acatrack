from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from settings import settings

_raw_url = settings.database_url
if _raw_url.startswith("postgresql+asyncpg://"):
    sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
elif _raw_url.startswith("postgres://"):
    sync_url = _raw_url
else:
    sync_url = _raw_url

sync_engine = create_engine(
    sync_url,
    pool_size=10,
    max_overflow=10,
    pool_timeout=30,
)
SyncSessionLocal = sessionmaker(bind=sync_engine)
Session = scoped_session(SyncSessionLocal)

class DummyDB:
    @property
    def session(self):
        return Session()

db = DummyDB()
