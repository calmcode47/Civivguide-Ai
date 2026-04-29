from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Dict

from google.cloud import firestore

# Use Application Default Credentials (ADC) on Cloud Run.
_async_client: firestore.AsyncClient | None = None


def _get_client() -> firestore.AsyncClient:
    global _async_client
    if _async_client is None:
        _async_client = firestore.AsyncClient()
    return _async_client


async def create_or_get_session(session_id: str | None, language: str) -> str:
    """
    Create a new session document if it does not exist, otherwise return the
    existing id. Returns the concrete session_id used.
    """
    now = datetime.now(timezone.utc)

    client = _get_client()

    if not session_id:
        # Let Firestore generate a new id.
        doc_ref = client.collection("sessions").document()
        session_id = doc_ref.id
        await doc_ref.set(
            {
                "created_at": now,
                "language": language,
                "message_count": 0,
                "last_active": now,
                "userId": None,
            },
            merge=True,
        )
        return session_id

    doc_ref = client.collection("sessions").document(session_id)
    snap = await doc_ref.get()

    if not snap.exists:
        await doc_ref.set(
            {
                "created_at": now,
                "language": language,
                "message_count": 0,
                "last_active": now,
                "userId": None,
            },
            merge=True,
        )
    else:
        await doc_ref.update({"last_active": now})

    return session_id


async def save_message(session_id: str, role: str, content: str, language: str) -> str:
    """
    Persist a chat message inside sessions/{session_id}/messages.
    """
    now = datetime.now(timezone.utc)
    client = _get_client()
    session_ref = client.collection("sessions").document(session_id)

    msg_ref = session_ref.collection("messages").document()
    await msg_ref.set(
        {
            "role": role,
            "content": content,
            "timestamp": now,
            "language": language,
        }
    )

    # Increment message_count and bump last_active.
    await session_ref.set(
        {
            "last_active": now,
            "message_count": firestore.Increment(1),
        },
        merge=True,
    )

    return msg_ref.id


async def get_session_history(session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return the last `limit` messages for a session, in chronological order.
    """
    client = _get_client()
    session_ref = client.collection("sessions").document(session_id)
    messages_ref = session_ref.collection("messages")

    query = (
        messages_ref.order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )

    docs = [d async for d in query.stream()]

    # Oldest first for model context.
    history: List[Dict[str, Any]] = []
    for d in reversed(docs):
        data = d.to_dict() or {}
        history.append(
            {
                "role": data.get("role", "user"),
                "content": data.get("content", ""),
                "language": data.get("language"),
                "timestamp": data.get("timestamp"),
            }
        )
    return history


async def save_feedback(session_id: str, rating: int, comment: str | None) -> None:
    """
    Save user feedback for a given session.
    """
    if rating < 1 or rating > 5:
        raise ValueError("rating must be between 1 and 5")

    now = datetime.now(timezone.utc)
    client = _get_client()
    feedback_ref = client.collection("feedback").document()
    await feedback_ref.set(
        {
            "session_id": session_id,
            "rating": rating,
            "comment": comment,
            "timestamp": now,
        }
    )

