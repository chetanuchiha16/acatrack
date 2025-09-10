from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
from flask_migrate import Migrate

from flask_bcrypt import Bcrypt
from flask_cors import CORS

db = SQLAlchemy()
bcrypt = Bcrypt()

# app_init.py
def create_app(batch_year=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    
    if batch_year:
        # Override DB path dynamically
        from models.paths import get_db_path
        app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{get_db_path(batch_year)}"
        print(app.config['SQLALCHEMY_DATABASE_URI'])
    
    db.init_app(app)
    migrate = Migrate(app, db)
    from models import StudentAuth,Teacher,StudentAuth, Mentor, ParentAuth, Meeting, PasswordResetToken, StudentMessageStatus, MentorMessage
    CORS(app, supports_credentials=True)
    return app

