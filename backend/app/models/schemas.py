from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(..., min_length=1, max_length=2000)
    language: Literal["en", "hi"] = "en"


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    sources: list[str] = []


class TimelineEvent(BaseModel):
    id: str
    title: str
    description: str
    phase: str
    order: int
    icon: str
    typical_duration_days: int


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class TranslateResponse(BaseModel):
    translated_text: str
    detected_source: str

