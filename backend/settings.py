import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    firebase_cred_path: str = ""
    email_pass: str = ""
    a_email: str = ""
    default_number: str = ""
    c_email: str = ""
    secret_key: str = "dev-secret-key"
    admin_secret: str = "dev-admin-secret"
    database_url: str = "sqlite+aiosqlite:///dev.db"
    redis_url: str = "redis://localhost:6379/0"
    render: str = "false"
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    testing: bool = False
    cors_allowed_origins: str = "*"
    college_name: str = "AcaTrack Portal"
    college_tagline: str = "Academic Analytics & Tracking"
    logo_url: str = "https://hpavqkjevepfegkojisn.supabase.co/storage/v1/object/public/uploads/Inputs/Images/logo.png"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="",  # Default, but explicit
    )


settings = Settings()
