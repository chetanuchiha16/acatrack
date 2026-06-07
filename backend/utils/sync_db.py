from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from settings import settings
from database import demo_session_var

_sync_engines = {}
_session_factories = {}


def get_routing_sync_session():
    session_id = demo_session_var.get()
    if session_id:
        sync_url = f"sqlite:////tmp/acatrack_demos/demo_{session_id}.db"
    else:
        _raw_url = settings.database_url
        if _raw_url.startswith("postgresql+asyncpg://"):
            sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        elif _raw_url.startswith("postgres://"):
            sync_url = _raw_url
        else:
            sync_url = _raw_url

    if sync_url not in _sync_engines:
        if sync_url.startswith("sqlite"):
            _sync_engines[sync_url] = create_engine(sync_url)
        else:
            _sync_engines[sync_url] = create_engine(
                sync_url,
                pool_size=10,
                max_overflow=10,
                pool_timeout=30,
            )
        _session_factories[sync_url] = scoped_session(
            sessionmaker(bind=_sync_engines[sync_url])
        )

    return _session_factories[sync_url]()


class DummyDB:
    @property
    def session(self):
        return get_routing_sync_session()


db = DummyDB()
