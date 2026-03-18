"""
Centralized error handling for the Flask application.

Registers a uniform JSON error response for all unhandled exceptions and
common HTTP error codes. Every error uses the same envelope:
  {"error": "<message>", "code": <http_status>}
"""

from flask import jsonify
from logger_config import get_logger
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

logger = get_logger(__name__)


def register_error_handlers(app):
    """Register all error handlers on the Flask app."""

    @app.errorhandler(ValidationError)
    def handle_validation_error(e):
        """Pydantic validation errors → 422 with field-level detail."""
        errors = e.errors()
        messages = [
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors
        ]
        logger.warning(f"Request validation failed: {messages}")
        return jsonify(
            {"error": "Validation failed", "details": messages, "code": 422}
        ), 422

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Werkzeug HTTP errors (404, 405, etc.) → uniform JSON."""
        logger.warning(f"HTTP {e.code}: {e.description}")
        return jsonify({"error": e.description, "code": e.code}), e.code

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        """Catch-all for unexpected exceptions — never leak tracebacks."""
        logger.error(f"Unhandled exception: {e}", exc_info=True)
        return jsonify(
            {"error": "An internal server error occurred.", "code": 500}
        ), 500
