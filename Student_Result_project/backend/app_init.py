from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from models.paths import postgres_db_url

db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()  # <-- make Migrate global

def create_app(batch_year=None, postgres_url=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if postgres_url is None:
        # user = "chetan"
        # password = "chetan"
        # host = "localhost"
        # port = 5433
        # db_name = "Group_Project"
        postgres_url = postgres_db_url

    app.config['SQLALCHEMY_DATABASE_URI'] = postgres_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate.init_app(app, db)  # <-- use global migrate

    CORS(app, supports_credentials=True)

    # Import models here so Flask-Migrate sees them
    from models import StudentAuth, Teacher, Mentor, ParentAuth, Meeting, PasswordResetToken, StudentMessageStatus, MentorMessage

    return app
