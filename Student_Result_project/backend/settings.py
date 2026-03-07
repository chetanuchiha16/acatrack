import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    firebase_cred_path: str
    email_pass: str
    a_email: str
    default_number: str
    c_email: str
    secret_key: str
    admin_secret: str
    database_url: str
    render: str = "false"
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    model_config = SettingsConfigDict(
        # Point to the directory where settings.py lives
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()