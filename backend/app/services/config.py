from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import Field
from pydantic.functional_validators import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GOOGLE_CLOUD_PROJECT: str = ""
    FIRESTORE_PROJECT_ID: str = ""
    FIRESTORE_CREDENTIALS_FILE: str = ""
    FIRESTORE_CREDENTIALS_JSON: str = ""
    ALLOWED_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://localhost:3000",
        ]
    )
    RATE_LIMIT_PER_MINUTE: int = 30
    SESSION_HISTORY_LIMIT: int = 20
    ENVIRONMENT: str = "development"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, (list, tuple)):
            return [str(item).strip() for item in value if str(item).strip()]
        raise TypeError("ALLOWED_ORIGINS must be a comma-separated string or list")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
