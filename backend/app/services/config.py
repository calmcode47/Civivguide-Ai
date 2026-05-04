from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"
    GEMINI_MODELS: str = ""
    GEMINI_CHAT_MAX_OUTPUT_TOKENS: int = 500
    GEMINI_PLAN_MAX_OUTPUT_TOKENS: int = 650
    GEMINI_BALLOT_MAX_OUTPUT_TOKENS: int = 300
    GOOGLE_CLOUD_PROJECT: str = ""
    FIRESTORE_PROJECT_ID: str = ""
    FIRESTORE_CREDENTIALS_FILE: str = ""
    FIRESTORE_CREDENTIALS_JSON: str = ""
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://localhost:5181,http://localhost:5182,http://localhost:5183,http://localhost:5184,http://localhost:5185,http://localhost:5186,http://localhost:5187,http://localhost:5188,http://localhost:5189,http://localhost:5190"
    )
    RATE_LIMIT_PER_MINUTE: int = 30
    SESSION_HISTORY_LIMIT: int = 20
    PROMPT_HISTORY_MESSAGE_LIMIT: int = 6
    ENVIRONMENT: str = "development"

    @property
    def resolved_gemini_models(self) -> list[str]:
        if self.GEMINI_MODELS.strip():
            return list(dict.fromkeys(item.strip() for item in self.GEMINI_MODELS.split(",") if item.strip()))

        primary = self.GEMINI_MODEL.strip() or "gemini-flash-lite-latest"
        fallback = "gemini-2.5-flash-lite"
        models = [primary]
        if fallback != primary:
            models.append(fallback)
        return models

    @property
    def resolved_allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.ALLOWED_ORIGINS.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
