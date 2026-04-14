"""
Centralized error handling for the FastAPI application.

Registers a uniform JSON error response for all unhandled exceptions.
Every error uses the same envelope:
  {"error": "<message>", "code": <http_status>}
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from logger_config import get_logger

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(request: Request, exc: RequestValidationError):
        """FastAPI request validation errors → 422 with field-level detail."""
        errors = exc.errors()
        messages = [
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors
        ]
        logger.warning(f"Request validation failed: {messages}")
        return JSONResponse(
            status_code=422,
            content={"error": "Validation failed", "details": messages, "code": 422},
        )

    @app.exception_handler(ValidationError)
    async def handle_pydantic_validation_error(request: Request, exc: ValidationError):
        """Pydantic validation errors → 422 with field-level detail."""
        errors = exc.errors()
        messages = [
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors
        ]
        logger.warning(f"Pydantic validation failed: {messages}")
        return JSONResponse(
            status_code=422,
            content={"error": "Validation failed", "details": messages, "code": 422},
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        """HTTP errors (404, 405, etc.) → uniform JSON."""
        logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "code": exc.status_code},
        )

    @app.exception_handler(Exception)
    async def handle_generic_exception(request: Request, exc: Exception):
        """Catch-all for unexpected exceptions — never leak tracebacks."""
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "An internal server error occurred.", "code": 500},
        )
