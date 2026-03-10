import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    firebase_cred_path: str
    email_pass: str
    a_email: str
    default_number: str
    c_email: str
    secret_key: str
    admin_secret: str
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    render: str = "false"
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()