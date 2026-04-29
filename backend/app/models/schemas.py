from __future__ import annotations

from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field

LanguageCode = Literal["en", "hi"]
T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    status: Literal["success", "error"] = "success"
    data: T
    error: str | None = None


class OfficialResource(BaseModel):
    title: str
    url: str


class HealthPayload(BaseModel):
    service: str
    version: str
    environment: str
    backend_ready: bool
    gemini_ready: bool
    firestore_mode: Literal["firestore", "memory"]
    rate_limit_per_minute: int
    cloud_project_id: str | None = None
    firestore_project_id: str | None = None


class RootPayload(BaseModel):
    service: str
    version: str
    status: Literal["ok"]
    health_path: str


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(..., min_length=1, max_length=2000)
    language: LanguageCode = "en"
    user_context: str = Field(default="general", max_length=80)


class ChatReplyPayload(BaseModel):
    session_id: str
    reply: str
    intent: str
    suggestions: list[str] = Field(default_factory=list)
    sources: list[OfficialResource] = Field(default_factory=list)


class SessionMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    language: LanguageCode = "en"
    timestamp: datetime
    intent: str | None = None


class SessionSummary(BaseModel):
    id: str
    title: str
    user_context: str
    language: LanguageCode = "en"
    message_count: int
    updated_at: datetime


class SessionListPayload(BaseModel):
    sessions: list[SessionSummary] = Field(default_factory=list)


class SessionDetailPayload(BaseModel):
    session: SessionSummary
    messages: list[SessionMessage] = Field(default_factory=list)


class DeleteSessionPayload(BaseModel):
    session_id: str
    deleted: bool


class ElectionStep(BaseModel):
    id: str
    phase: str
    title: str
    description: str
    duration: str
    order: int
    details: list[str]


class ElectionPhase(BaseModel):
    id: str
    name: str
    color: str
    steps: list[ElectionStep]


class ElectionTimelinePayload(BaseModel):
    phases: list[ElectionPhase]
    total_steps: int
    sources: list[OfficialResource] = Field(default_factory=list)


class SuggestionsPayload(BaseModel):
    persona: str
    language: LanguageCode = "en"
    suggestions: list[str] = Field(default_factory=list)


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    target_language: str


class TranslatePayload(BaseModel):
    translated_text: str
    detected_source: str


class VotingPlanRequest(BaseModel):
    registration_status: str = Field(..., min_length=1, max_length=120)
    location_context: str = Field(..., min_length=1, max_length=120)
    planning_focus: str = Field(..., min_length=1, max_length=120)
    language: LanguageCode = "en"


class VotingPlanPayload(BaseModel):
    plan_markdown: str
    suggestions: list[str] = Field(default_factory=list)
    sources: list[OfficialResource] = Field(default_factory=list)


class BallotDecodeRequest(BaseModel):
    term: str = Field(..., min_length=1, max_length=120)
    context: str = Field(..., min_length=1, max_length=500)
    category: Literal["legal", "position", "procedure", "technology", "voter-aid"]
    language: LanguageCode = "en"


class BallotDecodePayload(BaseModel):
    explanation: str
    related_terms: list[str] = Field(default_factory=list)
    sources: list[OfficialResource] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


class FeedbackPayload(BaseModel):
    saved: bool
