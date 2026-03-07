from app import app
from models.cloud_utils import supabase, SUPABASE_BUCKET

if supabase:
    res = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs")
    print("Type of res:", type(res))
    if isinstance(res, list):
        print("It's a list. Items:", len(res))
        if len(res) > 0:
            print("First item:", res[0])
    elif hasattr(res, 'data'):
        print("Has .data attribute. Length of data:", len(res.data))
        if len(res.data) > 0:
            print("First item in data:", res.data[0])
    else:
        print("Unknown type:", res)
else:
    print("Supabase is None")
