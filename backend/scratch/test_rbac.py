# backend/scratch/test_rbac.py
import asyncio
import sys
import os
import jwt

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from settings import settings
from utils.helpers import verify_teacher_section_access
from fastapi import Request, HTTPException

async def test_guard():
    print("🧪 Running RBAC/ABAC Verification Test...")
    
    # 1. Generate JWT Token for demostaff (role: 'Staff')
    payload = {
        "id": "demostaff",
        "who": "Staff",
        "batch_year": 2023
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    
    # 2. Mock FastAPI Request with Authorization header
    headers = [
        (b"authorization", f"Bearer {token}".encode())
    ]
    scope = {
        "type": "http",
        "headers": headers
    }
    mock_request = Request(scope=scope)
    
    async with AsyncSessionLocal() as session:
        # Test Case 1: Authorized section "D" (demostaff is assigned to section D)
        print("\n--- Test Case 1: Checking access to authorized section 'D' ---")
        try:
            await verify_teacher_section_access(
                db=session,
                request=mock_request,
                requested_section_name="D",
                requested_batch_year=2023
            )
            print("✅ Access GRANTED successfully (as expected)!")
        except HTTPException as e:
            print(f"❌ Unexpected failure: Access denied with status {e.status_code}: {e.detail}")
            
        # Test Case 2: Unauthorized section "A" (demostaff has NO assignment for section A)
        print("\n--- Test Case 2: Checking access to unauthorized section 'A' ---")
        try:
            await verify_teacher_section_access(
                db=session,
                request=mock_request,
                requested_section_name="A",
                requested_batch_year=2023
            )
            print("❌ Failure: Access was incorrectly GRANTED to unauthorized section 'A'!")
        except HTTPException as e:
            if e.status_code == 403:
                print(f"✅ Access DENIED successfully (as expected)! Status: {e.status_code}, Detail: {e.detail}")
            else:
                print(f"❌ Unexpected status code: {e.status_code}: {e.detail}")
                
        # Test Case 3: Section-less query (None)
        print("\n--- Test Case 3: Checking section-less query (None) ---")
        try:
            await verify_teacher_section_access(
                db=session,
                request=mock_request,
                requested_section_name=None,
                requested_batch_year=2023
            )
            print("❌ Failure: Access was incorrectly GRANTED for a section-less query!")
        except HTTPException as e:
            if e.status_code == 403:
                print(f"✅ Access DENIED successfully (as expected)! Status: {e.status_code}, Detail: {e.detail}")
            else:
                print(f"❌ Unexpected status code: {e.status_code}: {e.detail}")

        # Import student access guard
        from utils.helpers import verify_teacher_student_access

        # Test Case 4: Student-level authorized access (demostaff teaches section D)
        print("\n--- Test Case 4: Checking access to student in taught section ('Demo Student D' -> USN: 1JS23D9999) ---")
        try:
            await verify_teacher_student_access(
                db=session,
                request=mock_request,
                student_usn="1JS23D9999",
                batch_year=2023
            )
            print("✅ Access GRANTED successfully (as expected)!")
        except HTTPException as e:
            print(f"❌ Unexpected failure: Student access denied with status {e.status_code}: {e.detail}")

        # Test Case 5: Student-level unauthorized access (demostaff does not teach section A)
        print("\n--- Test Case 5: Checking access to student in untaught section ('Demo Student A' -> USN: 1JS23A9999) ---")
        try:
            await verify_teacher_student_access(
                db=session,
                request=mock_request,
                student_usn="1JS23A9999",
                batch_year=2023
            )
            print("❌ Failure: Access was incorrectly GRANTED to student in untaught section!")
        except HTTPException as e:
            if e.status_code == 403:
                print(f"✅ Access DENIED successfully (as expected)! Status: {e.status_code}, Detail: {e.detail}")
            else:
                print(f"❌ Unexpected status code: {e.status_code}: {e.detail}")

if __name__ == "__main__":
    asyncio.run(test_guard())
