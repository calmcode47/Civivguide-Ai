from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import google.auth
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import firestore
from google.oauth2 import service_account

from app.models.schemas import SessionMessage, SessionSummary
from app.services.config import Settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _title_from_message(message: str) -> str:
    compact = " ".join(message.split()).strip()
    if not compact:
        return "New conversation"
    return compact[:57] + "..." if len(compact) > 60 else compact


class SessionStore(ABC):
    mode: str

    @abstractmethod
    async def ensure_session(
        self,
        session_id: str | None,
        *,
        language: str,
        user_context: str,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    async def add_message(
        self,
        session_id: str,
        *,
        role: str,
        content: str,
        language: str,
        intent: str | None,
    ) -> SessionMessage:
        raise NotImplementedError

    @abstractmethod
    async def get_history(self, session_id: str, *, limit: int) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def list_sessions(self, *, limit: int) -> list[SessionSummary]:
        raise NotImplementedError

    @abstractmethod
    async def get_session_detail(self, session_id: str) -> tuple[SessionSummary, list[SessionMessage]] | None:
        raise NotImplementedError

    @abstractmethod
    async def delete_session(self, session_id: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def save_feedback(self, session_id: str, rating: int, comment: str | None) -> None:
        raise NotImplementedError


class InMemorySessionStore(SessionStore):
    mode = "memory"

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.feedback: list[dict[str, Any]] = []

    async def ensure_session(
        self,
        session_id: str | None,
        *,
        language: str,
        user_context: str,
    ) -> str:
        now = _utcnow()
        concrete_id = session_id or f"session_{uuid4().hex[:12]}"
        session = self.sessions.get(concrete_id)
        if session is None:
            self.sessions[concrete_id] = {
                "id": concrete_id,
                "title": "New conversation",
                "user_context": user_context,
                "language": language,
                "message_count": 0,
                "created_at": now,
                "updated_at": now,
                "messages": [],
            }
        else:
            session["updated_at"] = now
            session["language"] = language
            session["user_context"] = user_context
        return concrete_id

    async def add_message(
        self,
        session_id: str,
        *,
        role: str,
        content: str,
        language: str,
        intent: str | None,
    ) -> SessionMessage:
        session = self.sessions[session_id]
        now = _utcnow()
        message = SessionMessage(
            id=f"msg_{uuid4().hex[:12]}",
            role=role,  # type: ignore[arg-type]
            content=content,
            language=language,  # type: ignore[arg-type]
            timestamp=now,
            intent=intent,
        )
        session["messages"].append(message)
        session["message_count"] = len(session["messages"])
        session["updated_at"] = now
        if role == "user" and session["title"] == "New conversation":
            session["title"] = _title_from_message(content)
        return message

    async def get_history(self, session_id: str, *, limit: int) -> list[dict[str, Any]]:
        session = self.sessions.get(session_id)
        if session is None:
            return []
        messages = session["messages"][-limit:]
        return [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "language": message.language,
                "timestamp": message.timestamp,
                "intent": message.intent,
            }
            for message in messages
        ]

    async def list_sessions(self, *, limit: int) -> list[SessionSummary]:
        sessions = sorted(
            self.sessions.values(),
            key=lambda session: session["updated_at"],
            reverse=True,
        )
        return [
            SessionSummary(
                id=session["id"],
                title=session["title"],
                user_context=session["user_context"],
                language=session["language"],
                message_count=session["message_count"],
                updated_at=session["updated_at"],
            )
            for session in sessions[:limit]
        ]

    async def get_session_detail(self, session_id: str) -> tuple[SessionSummary, list[SessionMessage]] | None:
        session = self.sessions.get(session_id)
        if session is None:
            return None
        summary = SessionSummary(
            id=session["id"],
            title=session["title"],
            user_context=session["user_context"],
            language=session["language"],
            message_count=session["message_count"],
            updated_at=session["updated_at"],
        )
        return summary, list(session["messages"])

    async def delete_session(self, session_id: str) -> bool:
        return self.sessions.pop(session_id, None) is not None

    async def save_feedback(self, session_id: str, rating: int, comment: str | None) -> None:
        self.feedback.append(
            {
                "session_id": session_id,
                "rating": rating,
                "comment": comment,
                "timestamp": _utcnow(),
            }
        )


class FirestoreSessionStore(SessionStore):
    mode = "firestore"

    def __init__(self, *, project_id: str, credentials: service_account.Credentials | None = None) -> None:
        self.client = firestore.AsyncClient(project=project_id, credentials=credentials)

    async def ensure_session(
        self,
        session_id: str | None,
        *,
        language: str,
        user_context: str,
    ) -> str:
        now = _utcnow()
        if not session_id:
            session_ref = self.client.collection("sessions").document()
            session_id = session_ref.id
            await session_ref.set(
                {
                    "title": "New conversation",
                    "user_context": user_context,
                    "language": language,
                    "message_count": 0,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            return session_id

        session_ref = self.client.collection("sessions").document(session_id)
        snapshot = await session_ref.get()
        if snapshot.exists:
            await session_ref.set(
                {
                    "user_context": user_context,
                    "language": language,
                    "updated_at": now,
                },
                merge=True,
            )
        else:
            await session_ref.set(
                {
                    "title": "New conversation",
                    "user_context": user_context,
                    "language": language,
                    "message_count": 0,
                    "created_at": now,
                    "updated_at": now,
                }
            )
        return session_id

    async def add_message(
        self,
        session_id: str,
        *,
        role: str,
        content: str,
        language: str,
        intent: str | None,
    ) -> SessionMessage:
        now = _utcnow()
        session_ref = self.client.collection("sessions").document(session_id)
        message_ref = session_ref.collection("messages").document()
        payload = {
            "role": role,
            "content": content,
            "language": language,
            "timestamp": now,
            "intent": intent,
        }
        await message_ref.set(payload)

        update_payload: dict[str, Any] = {
            "language": language,
            "updated_at": now,
            "message_count": firestore.Increment(1),
        }
        if role == "user":
            snapshot = await session_ref.get()
            current_title = (snapshot.to_dict() or {}).get("title") if snapshot.exists else None
            if not current_title or current_title == "New conversation":
                update_payload["title"] = _title_from_message(content)
        if intent:
            update_payload["last_intent"] = intent

        await session_ref.set(update_payload, merge=True)

        return SessionMessage(
            id=message_ref.id,
            role=role,  # type: ignore[arg-type]
            content=content,
            language=language,  # type: ignore[arg-type]
            timestamp=now,
            intent=intent,
        )

    async def get_history(self, session_id: str, *, limit: int) -> list[dict[str, Any]]:
        session_ref = self.client.collection("sessions").document(session_id)
        query = (
            session_ref.collection("messages")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        docs = [doc async for doc in query.stream()]
        history: list[dict[str, Any]] = []
        for doc in reversed(docs):
            data = doc.to_dict() or {}
            history.append(
                {
                    "id": doc.id,
                    "role": data.get("role", "user"),
                    "content": data.get("content", ""),
                    "language": data.get("language", "en"),
                    "timestamp": data.get("timestamp"),
                    "intent": data.get("intent"),
                }
            )
        return history

    async def list_sessions(self, *, limit: int) -> list[SessionSummary]:
        query = (
            self.client.collection("sessions")
            .order_by("updated_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        summaries: list[SessionSummary] = []
        async for doc in query.stream():
            data = doc.to_dict() or {}
            summaries.append(
                SessionSummary(
                    id=doc.id,
                    title=data.get("title", "New conversation"),
                    user_context=data.get("user_context", "general"),
                    language=data.get("language", "en"),
                    message_count=int(data.get("message_count", 0)),
                    updated_at=data.get("updated_at") or data.get("created_at") or _utcnow(),
                )
            )
        return summaries

    async def get_session_detail(self, session_id: str) -> tuple[SessionSummary, list[SessionMessage]] | None:
        session_ref = self.client.collection("sessions").document(session_id)
        snapshot = await session_ref.get()
        if not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        summary = SessionSummary(
            id=session_id,
            title=data.get("title", "New conversation"),
            user_context=data.get("user_context", "general"),
            language=data.get("language", "en"),
            message_count=int(data.get("message_count", 0)),
            updated_at=data.get("updated_at") or data.get("created_at") or _utcnow(),
        )
        history = await self.get_history(session_id, limit=200)
        messages = [SessionMessage(**message) for message in history]
        return summary, messages

    async def delete_session(self, session_id: str) -> bool:
        detail = await self.get_session_detail(session_id)
        if detail is None:
            return False
        session_ref = self.client.collection("sessions").document(session_id)
        messages_ref = session_ref.collection("messages")
        async for doc in messages_ref.stream():
            await doc.reference.delete()
        await session_ref.delete()
        return True

    async def save_feedback(self, session_id: str, rating: int, comment: str | None) -> None:
        feedback_ref = self.client.collection("feedback").document()
        await feedback_ref.set(
            {
                "session_id": session_id,
                "rating": rating,
                "comment": comment,
                "timestamp": _utcnow(),
            }
        )


def build_session_store(settings: Settings) -> SessionStore:
    firestore_project_id = settings.FIRESTORE_PROJECT_ID or settings.GOOGLE_CLOUD_PROJECT
    if not firestore_project_id:
        return InMemorySessionStore()

    credentials = None
    if settings.FIRESTORE_CREDENTIALS_FILE:
        try:
            credentials = service_account.Credentials.from_service_account_file(
                settings.FIRESTORE_CREDENTIALS_FILE
            )
        except Exception:
            return InMemorySessionStore()
    elif settings.FIRESTORE_CREDENTIALS_JSON:
        try:
            info = json.loads(settings.FIRESTORE_CREDENTIALS_JSON)
            credentials = service_account.Credentials.from_service_account_info(info)
        except Exception:
            return InMemorySessionStore()

    try:
        if credentials is None:
            google.auth.default()
    except DefaultCredentialsError:
        return InMemorySessionStore()
    except Exception:
        return InMemorySessionStore()

    return FirestoreSessionStore(project_id=firestore_project_id, credentials=credentials)
