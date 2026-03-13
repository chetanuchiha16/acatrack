from flask import Flask
from flask_cors import CORS

from models.config import Config
from models.paths import postgres_db_url
import models  # noqa: F401 — ensures all models are registered with SQLAlchemy for Flask-Migrate

from extensions import db, migrate, bcrypt, cache
from errors import register_error_handlers


def create_app(batch_year=None, postgres_url=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    # Database
    if postgres_url is None:
        postgres_url = postgres_db_url

    app.config['SQLALCHEMY_DATABASE_URI'] = postgres_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_pre_ping": True,
        "pool_size": 10,      # safely below the 15-slot limit
        "max_overflow": 0,    # no extra temporary connections
        "pool_recycle": 1800,
    }

    # Cache (Redis)
    from settings import settings
    app.config['CACHE_TYPE'] = 'RedisCache'
    app.config['CACHE_REDIS_URL'] = settings.redis_url
    app.config['CACHE_DEFAULT_TIMEOUT'] = 600  # 10 minutes

    # Initialise extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    cache.init_app(app)
    CORS(app, supports_credentials=True)

    # Teardown: close DB sessions after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    register_error_handlers(app)

    return app
