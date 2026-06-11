from supabase import create_client
import os
from dotenv import load_dotenv
from logger_config import get_logger

load_dotenv()
logger = get_logger(__name__)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = "uploads"
logger.debug(f"{SUPABASE_URL}")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def list_all_objects(prefix=""):
    print(f"Listing objects under: '{prefix}'")
    objects = supabase.storage.from_(SUPABASE_BUCKET).list(prefix)
    if not objects:
        print("No objects found under this prefix.")
        return
    for obj in objects:
        name = obj.get("name")
        mime = (obj.get("metadata", {}) or {}).get("mimetype", "??")
        size = obj.get("metadata", {}).get("size")
        print(f"- {name}   | mime: {mime} | size: {size}")
        # Recursively list subfolders, if any
        if mime == "application/x-directory":
            sub_prefix = f"{prefix}/{name}" if prefix else name
            list_all_objects(sub_prefix)

# ---- Run diagnostics ----
list_all_objects("notes/2023/sem5")
prefix = "notes/2023/sem5"
entries = supabase.storage.from_(SUPABASE_BUCKET).list(prefix)
tree = {}
for entry in entries:
    name = entry.get('name')
    mimetype = (entry.get('metadata') or {}).get('mimetype', '')
    print(f"name={name} | mimetype={mimetype}")
    if mimetype == "application/x-directory":
        continue
    if name and name.lower().endswith('.pdf'):
        tree[name] = None
print(tree)
