import json
from main import app

openapi_data = app.openapi()
with open("openapi.json", "w") as f:
    json.dump(openapi_data, f)
