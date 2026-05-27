# backend/scratch/test_overall_res.py
import asyncio
import sys
import os
import jwt

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from settings import settings
from routes.send_uni_data import get_academic_performance
from fastapi import Request, HTTPException


async def test_overall():
    print("🧪 Running Overall Results Endpoint Verification Test...")

    # 1. Generate JWT Token for demostaff (role: 'Staff')
    payload = {"id": "demostaff", "who": "Staff", "batch_year": 2023}
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")

    # 2. Mock FastAPI Requests with Authorization header
    headers = [(b"authorization", f"Bearer {token}".encode())]

    async with AsyncSessionLocal() as session:
        # Query 1: Authorized section "D"
        print("\n--- Query 1: Requesting authorized section 'D' ---")
        scope_d = {
            "type": "http",
            "headers": headers,
            "query_string": b"semester=sem1&section=D",
        }
        req_d = Request(scope=scope_d)
        try:
            res_d = await get_academic_performance(
                request=req_d, semester="sem1", section="D", batch_year=2023, db=session
            )
            print(f"✅ Success! Returned {len(res_d)} students.")
            print(f"First student USN: {res_d[0]['usn']}, Section: D")
        except HTTPException as e:
            print(
                f"❌ Unexpected failure: Access denied with status {e.status_code}: {e.detail}"
            )

        # Query 2: Unauthorized section "B"
        print("\n--- Query 2: Requesting unauthorized section 'B' ---")
        scope_b = {
            "type": "http",
            "headers": headers,
            "query_string": b"semester=sem1&section=B",
        }
        req_b = Request(scope=scope_b)
        try:
            res_b = await get_academic_performance(
                request=req_b, semester="sem1", section="B", batch_year=2023, db=session
            )
            print(
                "❌ Failure: Access was incorrectly GRANTED to unauthorized section 'B'!"
            )
            print(f"Returned data: {res_b}")
        except HTTPException as e:
            print(
                f"✅ Access DENIED successfully (as expected)! Status: {e.status_code}, Detail: {e.detail}"
            )


if __name__ == "__main__":
    asyncio.run(test_overall())
