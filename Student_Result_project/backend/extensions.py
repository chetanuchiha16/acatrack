# backend/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_caching import Cache

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
cache = Cache()