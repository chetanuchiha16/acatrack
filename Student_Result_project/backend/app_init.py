from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db = SQLAlchemy()
bcrypt = Bcrypt()

def create_app(batch_year=None, postgres_url=None):
    """
    Initialize Flask app with SQLAlchemy connected to PostgreSQL.
    batch_year is optional; used for table suffixes when needed.
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Use PostgreSQL instead of SQLite
    if postgres_url is None:
        user = "chetan"
        password = "chetan"
        host = "localhost"
        port = 5433
        db_name = "Group_Project"
        postgres_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"
    
    app.config['SQLALCHEMY_DATABASE_URI'] = postgres_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    print(f"[Flask] Using DB: {app.config['SQLALCHEMY_DATABASE_URI']}")

    db.init_app(app)
    Migrate(app, db)

    # Import your models after db is initialized
    from models import StudentAuth, Teacher, Mentor, ParentAuth, Meeting, PasswordResetToken, StudentMessageStatus, MentorMessage
    
    CORS(app, supports_credentials=True)
    
    return app
