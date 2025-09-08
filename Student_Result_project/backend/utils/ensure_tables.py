from models.users import db, PasswordResetToken
from models.batch_manager import bm

def ensure_tables():
    for year, app in bm.apps.items():
        with app.app_context():
            db.create_all()
            print(f"Ensured tables for batch {year}")

if __name__ == "__main__":
    ensure_tables()