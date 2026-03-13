"""
Pydantic request validators for email-related endpoints.

Usage:
    from validators.email_validators import SendAllEmailRequest
    body = SendAllEmailRequest.model_validate(request.get_json() or {})
"""

from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, field_validator


class SendAllEmailRequest(BaseModel):
    recipientType: Literal["student", "parent"] = "student"
    subject: str
    message: str

    @field_validator("subject", "message")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be blank")
        return v.strip()


class SendStudentEmailRequest(BaseModel):
    usn: str
    subject: str
    message: str
    recipientType: Literal["student", "parent"] = "student"

    @field_validator("usn", "subject", "message")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be blank")
        return v.strip()


class SaveMessageRequest(BaseModel):
    usn: Optional[str] = None
    recipientType: str
    subject: str
    message: str

    @field_validator("recipientType", "subject", "message")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be blank")
        return v.strip()
