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
    """Mocks the BatchManager instance across routes"""
    with patch("models.batch_manager.bm") as mock_bm_instance:
        # Define common behavior
        mock_bm_instance.list_batches.return_value = ["2022", "2023", "2024"]

        # Make session_scope yield the REAL database object, not a MagicMock
        from extensions import db as real_db

        class RealSessionMockCM:
            def __enter__(self):
                return real_db

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        mock_bm_instance.session_scope.return_value = RealSessionMockCM()

        yield {
            "bm": mock_bm_instance,
            "session_scope_cm": RealSessionMockCM,
            "db": real_db,
        }
