import sqlite3
from models.paths import db_path

conn = sqlite3.connect(db_path)   # path to your db
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(SEM1);")
for col in cursor.fetchall():
    print(col)

conn.close()
