# backend/security.py
"""
Password hashing utilities — replaces Flask-Bcrypt.
"""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a plain-text password and return UTF-8 string."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
