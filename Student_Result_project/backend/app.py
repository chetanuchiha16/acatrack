# app.py
import os

import firebase_admin
from app_init import create_app, db
from dotenv import load_dotenv
from firebase_admin import credentials
from flask import jsonify
from logger_config import get_logger
from models.batch_manager import BatchManager
from routes import register_routes
from sqlalchemy import text

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


with app.app_context():
    try:
        db.session.execute(text("SELECT 1"))
        logger.debug("Connection successful!")
    except Exception as e:
        logger.debug(f"Failed to connect: {e}")

# logger.debug(f"Using database:{app.config['SQLALCHEMY_DATABASE_URI']}")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
