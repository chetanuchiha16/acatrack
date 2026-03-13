from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from models.paths import postgres_db_url

from extensions import db, migrate, bcrypt

def create_app(batch_year=None, postgres_url=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure Redis Cache
    from settings import settings
    app.config['CACHE_TYPE'] = 'RedisCache'
    app.config['CACHE_REDIS_URL'] = settings.redis_url
    app.config['CACHE_DEFAULT_TIMEOUT'] = 600 # 10 minutes

    if postgres_url is None:
        # user = "chetan"
        # password = "chetan"
        # host = "localhost"
        # port = 5433
        # db_name = "Group_Project"
        postgres_url = postgres_db_url

    app.config['SQLALCHEMY_DATABASE_URI'] = postgres_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_pre_ping": True,
        "pool_size": 10,      # safely below the 15-slot limit
        "max_overflow": 0,    # no extra temporary connections
        "pool_recycle": 1800
    }


    db.init_app(app)
    migrate.init_app(app, db)  # <-- use global migrate
    
    from extensions import cache
    cache.init_app(app)

    CORS(app, supports_credentials=True)
     # Teardown function to close sessions after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()
    # Import models here so Flask-Migrate sees them
    from models import StudentAuth, Teacher, Mentor, ParentAuth, Meeting, PasswordResetToken, StudentMessageStatus, MentorMessage

    from errors import register_error_handlers
    register_error_handlers(app)

    return app
