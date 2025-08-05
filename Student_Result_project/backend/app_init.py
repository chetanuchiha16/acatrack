from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from models.config import Config
def create_app():
    db = SQLAlchemy()
    app = Flask(__name__)
    app.config.from_object(Config)
