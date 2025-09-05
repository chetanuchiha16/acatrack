from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
from flask_migrate import Migrate

from flask_bcrypt import Bcrypt
from flask_cors import CORS

db = SQLAlchemy()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    migrate = Migrate(app, db)
    from models import StudentAuth,Teacher,StudentAuth, Mentor, ParentAuth, Meeting, PasswordResetToken
    CORS(app, supports_credentials=True)
    return app
