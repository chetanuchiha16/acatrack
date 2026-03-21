import os

import pytest

os.environ["TESTING"] = "true"
from unittest.mock import patch

from app_init import create_app
from routes import register_routes


@pytest.fixture
def app():
    app = create_app(postgres_url="sqlite:///:memory:")
    app.config.update({"TESTING": True, "SECRET_KEY": "test_secret"})
    register_routes(app)

    # Needs application context
    with app.app_context():
        from extensions import db

        db.create_all()
        # Override the postgres URL config here if needed
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def mock_bm():
    """Mocks the BatchManager instance across routes.

    patch.object the source (services.batch_manager) plus all route modules
    that do `from services.batch_manager import bm`. This is required because
    Python's import system binds the name at import time; patching only the
    source won't affect already-bound references in route modules.
    """
    # All route modules that imported `bm` from services.batch_manager
    bm_locations = [
        "services.batch_manager.bm",
        "routes.admin_routes.bm",
        "routes.auth.bm",
        "routes.forgot_password.bm",
        "routes.mentee_meetings.bm",
        "routes.mentee_recieve_email.bm",
        "routes.mentee_record.bm",
        "routes.mentor_meetings.bm",
        "routes.mentor_send_email.bm",
        "routes.parent.bm",
        "routes.send_email.bm",
    ]

    from extensions import db as real_db

    class RealSessionMockCM:
        def __enter__(self):
            return real_db

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch(bm_locations[0]) as mock_bm_instance:
        mock_bm_instance.list_batches.return_value = ["2022", "2023", "2024"]
        mock_bm_instance.session_scope.return_value = RealSessionMockCM()

        extra_patches = [patch(loc, mock_bm_instance) for loc in bm_locations[1:]]
        for p in extra_patches:
            p.start()
        try:
            yield {
                "bm": mock_bm_instance,
                "session_scope_cm": RealSessionMockCM,
                "db": real_db,
            }
        finally:
            for p in extra_patches:
                p.stop()
