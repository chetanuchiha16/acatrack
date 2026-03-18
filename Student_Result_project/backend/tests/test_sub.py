import logging
# disable httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

from utils.cloud import supabase, SUPABASE_BUCKET

if supabase:
    print(f"Bucket: {SUPABASE_BUCKET}")
    res = supabase.storage.from_(SUPABASE_BUCKET).list()
    data = getattr(res, 'data', res)
    print("Root items:")
    for f in data:
        print(f["name"])

    print("\nPDFs items:")
    res_pdfs = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})
    pdf_data = getattr(res_pdfs, 'data', res_pdfs)
    for f in pdf_data:
        print(f["name"])
        
else:
    print("Supabase is None")
