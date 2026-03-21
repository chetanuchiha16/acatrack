import requests

url = "https://hpavqkjevepfegkojisn.supabase.co/storage/v1/object/public/uploads/pdfs/1JS23CS032_CHETAN_KISHOR_C_G_record.pdf"
resp = requests.head(url)
print(f"Status CODE: {resp.status_code}")
