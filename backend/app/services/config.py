from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import Field
from pydantic.functional_validators import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    App configuration loaded from environment variables / `.env`.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")
    GOOGLE_CLOUD_PROJECT: str = Field(
        ..., description="GCP project id for Firestore and other services"
    )
    # ALLOWED_ORIGINS comes in as a comma-separated string, but is exposed as list[str].
    ALLOWED_ORIGINS: list[str] = Field(
        default_factory=list,
        description="Comma-separated list of allowed CORS origins",
    )
    RATE_LIMIT_PER_MINUTE: int = 30
    ENVIRONMENT: str = "development"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        if isinstance(v, (list, tuple)):
            return [str(o).strip() for o in v if str(o).strip()]
        raise TypeError("ALLOWED_ORIGINS must be a comma-separated string or list")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

