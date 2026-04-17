from fastapi import APIRouter, Request
from services.batch_manager import bm
from utils.helpers import get_batch_year_from_request, get_jwt_payload_from_request
from logger_config import get_logger
from services.auth_service import authenticate_user, update_fcm_token
from pydantic import BaseModel
from typing import Optional
from schemas import AuthStatusResponse, LoginResponse, BatchesResponse

logger = get_logger(__name__)

router = APIRouter(tags=["auth"])


class AuthRequest(BaseModel):
    who: Optional[str] = None
    username: str
    password: str
    batch_year: Optional[int] = None


class FcmTokenRequest(BaseModel):
    fcm_token: str


@router.get("/batches", response_model=BatchesResponse)
async def list_batches():
    batches = await bm.list_batches()
    return {"batches": batches}


@router.post("/auth", response_model=LoginResponse)
async def auth(body: AuthRequest):
    result, error_msg, status_code = await authenticate_user(
        body.who, body.username, body.password, body.batch_year
    )

    if error_msg:
        from fastapi.responses import JSONResponse

        return JSONResponse(content={"error": error_msg}, status_code=status_code)

    return {"token": result["token"]}


@router.get("/auth/status", response_model=AuthStatusResponse)
async def auth_status(request: Request):
    payload = get_jwt_payload_from_request(request)
    if payload:
        return {
            "logged_in": True,
            "id": payload.get("id"),
            "name": payload.get("name"),
            "who": payload.get("who"),
            "batch_year": payload.get("batch_year"),
            "mentor_id": payload.get("mentor_id"),
        }
    else:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            content={"logged_in": False, "message": "Not logged in"},
            status_code=401,
        )


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}


@router.post("/student/{usn}/fcm-token")
async def save_fcm_token(usn: str, body: FcmTokenRequest, request: Request):
    batch_year = get_batch_year_from_request(request)

    success, error_msg, status_code = await update_fcm_token(
        usn, body.fcm_token, batch_year
    )
    if not success:
        from fastapi.responses import JSONResponse

        return JSONResponse(content={"error": error_msg}, status_code=status_code)

    return {"success": True}
