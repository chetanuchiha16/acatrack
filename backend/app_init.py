import models  # noqa: F401 — ensures all models are registered with SQLAlchemy for Flask-Migrate
from errors import register_error_handlers
from extensions import bcrypt, cache, db, migrate
from flask import Flask
from flask_cors import CORS
from models.config import Config
from models.paths import postgres_db_url
from settings import settings


def create_app(batch_year=None, postgres_url=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    # Database
    if postgres_url is None:
        postgres_url = postgres_db_url

    app.config["SQLALCHEMY_DATABASE_URI"] = postgres_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    if settings.testing:
        app.config["CACHE_TYPE"] = "SimpleCache"
        # SQLite doesn't support these pool args
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {}
    else:
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 0,
            "pool_recycle": 1800,
        }

        app.config["CACHE_TYPE"] = "RedisCache"
        app.config["CACHE_REDIS_URL"] = settings.redis_url
        app.config["CACHE_DEFAULT_TIMEOUT"] = 600

    # Initialise extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    cache.init_app(app)

    # CORS: Restrict to specific origins if configured
    cors_origins = settings.cors_allowed_origins

    CORS(
        app,
        supports_credentials=True,
        origins=cors_origins.split(",") if cors_origins != "*" else "*",
    )

    # Teardown: close DB sessions after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    register_error_handlers(app)

    return app
