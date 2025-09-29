import sqlite3
from models.paths import 

# Path to your database
db_path = db_path

# Output file
output_file = "db_schema.txt"

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query all schema objects
cursor.execute("SELECT type, name, sql FROM sqlite_master WHERE sql NOT NULL ORDER BY type, name;")
schema_objects = cursor.fetchall()

# Write schema to file
with open(output_file, "w", encoding="utf-8") as f:
    for obj_type, name, sql in schema_objects:
        f.write(f"-- {obj_type}: {name}\n")
        f.write(sql + ";\n\n")

print(f"Schema exported to {output_file}")

conn.close()
