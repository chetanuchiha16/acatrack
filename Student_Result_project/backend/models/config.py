class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = "sqlite:///user.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Secret key (should be in environment variable for production)
    SECRET_KEY = "supersecretkey"

    # Session configuration
    SESSION_TYPE = "filesystem"         # Or 'redis' for production
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True           # Sign cookies for security
    SESSION_COOKIE_HTTPONLY = True      # JS can't access cookies
    SESSION_COOKIE_SAMESITE = "None"    # Required for cross-site cookies with React
    SESSION_COOKIE_SECURE = True        # Only send over HTTPS in production
