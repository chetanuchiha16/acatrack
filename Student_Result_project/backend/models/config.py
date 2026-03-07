import os
from settings import settings

class Config:
    # Database
    # SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask secret key
    SECRET_KEY = settings.secret_key

    # Admin secret (for /admin endpoints)
    ADMIN_SECRET = settings.admin_secret  # fallback for dev


    # Session configuration
    SESSION_TYPE = "filesystem"         # Or 'redis' for production
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True           # Sign cookies for security
    SESSION_COOKIE_HTTPONLY = True      # JS can't access cookies
    SESSION_COOKIE_SAMESITE = "None"    # Required for cross-site cookies with React
    SESSION_COOKIE_SECURE = True        # Only send over HTTPS in production
