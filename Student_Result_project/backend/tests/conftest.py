import pytest
import datetime
from unittest.mock import patch, MagicMock
from app_init import create_app, bcrypt
from routes import register_routes

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SECRET_KEY": "test_secret",
        # Avoid connecting to an actual DB
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"
    })
    register_routes(app)
    
    # Needs application context
    with app.app_context():
        # Override the postgres URL config here if needed
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_bm():
    """Mocks the BatchManager instance across routes"""
    with patch("models.batch_manager.bm") as mock_bm_instance:
        # Define common behavior
        mock_bm_instance.list_batches.return_value = ["2022", "2023", "2024"]
        
        # Create a mock session that yields a mock db object
        mock_session_scope_cm = MagicMock()
        mock_db = MagicMock()
        mock_session_scope_cm.__enter__.return_value = mock_db
        mock_bm_instance.session_scope.return_value = mock_session_scope_cm
        
        yield {
            "bm": mock_bm_instance,
            "session_scope_cm": mock_session_scope_cm,
            "db": mock_db
        }
