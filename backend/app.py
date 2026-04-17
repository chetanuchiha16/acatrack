# backend/app.py
"""
Backward-compatibility shim.
Imports the FastAPI 'app' from main.py so that
    `uvicorn app:app`
still works alongside `uvicorn main:app`.
"""

from main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
