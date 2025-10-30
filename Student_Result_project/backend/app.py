# app.py
from flask import Flask
from flask_cors import CORS
from models.batch_manager import BatchManager
from routes import register_routes
from app_init import create_app, db
import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv
from logger_config import get_logger

logger = get_logger(__name__)

load_dotenv()
cred_path = os.environ.get("FIREBASE_CRED_PATH")
if not cred_path:
    raise Exception("FIREBASE_CRED_PATH not set!")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

bm = BatchManager()

# Use the factory to create Flask app
app = create_app()
register_routes(app)

# logger.debug(f"Using database:{app.config['SQLALCHEMY_DATABASE_URI']}")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
