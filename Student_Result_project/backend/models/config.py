
from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from flask_cors import CORS
from app import app
from flask_bcrypt import Bcrypt
# CORS(app,supports_credentials=True)

class Config:
    SQLALCHEMY_DATABASE_URI = "sqlite:///user.db"
    SQLALCHEMY_TRACK_MODIFICATEION = False
# db = SQLAlchemy()




