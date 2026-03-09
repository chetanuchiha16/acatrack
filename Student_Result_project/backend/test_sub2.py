import logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

from app import app
from models.cloud_utils import supabase, SUPABASE_BUCKET

if supabase:
    print(f"Bucket: {SUPABASE_BUCKET}")
    res_pdfs = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})
    print("Raw Response:", res_pdfs)
    
    # Supabase sdk sometimes returns empty list on success and dict with error on failure
    if isinstance(res_pdfs, dict) and "error" in res_pdfs:
        print("API Error:", res_pdfs["error"])
else:
    print("Supabase is None")
