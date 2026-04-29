from __future__ import annotations

import re
from typing import Any, AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services.firestore_service import (
    create_or_get_session,
    get_session_history,
    save_message,
    _get_client,  # type: ignore
)

router = APIRouter(prefix="/api", tags=["chat"])

_HTML_TAG_RE = re.compile(r"<[^>]*>")
MAX_MESSAGE_CHARS = 2000


def sanitize_input(text: str, *, max_chars: int = MAX_MESSAGE_CHARS) -> str:
    cleaned = _HTML_TAG_RE.sub("", text or "")
    cleaned = cleaned.strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, payload: ChatRequest) -> ChatResponse:
    message = sanitize_input(payload.message)
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    # Ensure session exists and get a concrete id.
    session_id = await create_or_get_session(payload.session_id, payload.language)
    history = await get_session_history(session_id, limit=20)

    reply = await request.app.state.gemini_service.generate_response(
        message=message, history=history, language=payload.language
    )

    # Persist conversation
    await save_message(session_id, role="user", content=message, language=payload.language)
    await save_message(session_id, role="assistant", content=reply, language=payload.language)

    return ChatResponse(session_id=session_id, reply=reply, sources=[])


@router.post("/chat/stream")
async def chat_stream(request: Request, payload: ChatRequest) -> StreamingResponse:
    message = sanitize_input(payload.message)
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    session_id = await create_or_get_session(payload.session_id, payload.language)
    history = await get_session_history(session_id, limit=20)

    async def event_generator() -> AsyncGenerator[str, None]:
        chunks: list[str] = []
        try:
            async for chunk in request.app.state.gemini_service.stream_response(
                message=message, history=history, language=payload.language
            ):
                chunks.append(chunk)
                # SSE contract: "data: {chunk}\n\n" per chunk
                yield f"data: {chunk}\n\n"

            # Persist conversation once full reply is known.
            full_reply = "".join(chunks).strip()
            await save_message(
                session_id, role="user", content=message, language=payload.language
            )
            await save_message(
                session_id, role="assistant", content=full_reply, language=payload.language
            )

            # SSE contract: "data: [DONE]\n\n" at end
            yield "data: [DONE]\n\n"
        except Exception as exc:
            # Keep SSE format valid.
            yield f"data: [ERROR] {str(exc)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/chat/history/{session_id}")
async def chat_history(request: Request, session_id: str) -> dict[str, Any]:
    session_id = sanitize_input(session_id, max_chars=2000)
    if not session_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    history = await get_session_history(session_id, limit=20)
    return {"session_id": session_id, "messages": history}


@router.delete("/chat/history/{session_id}")
async def clear_chat_history(request: Request, session_id: str) -> dict[str, Any]:
    session_id = sanitize_input(session_id, max_chars=2000)
    if not session_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    client = _get_client()
    session_ref = client.collection("sessions").document(session_id)
    messages_ref = session_ref.collection("messages")
    async for doc in messages_ref.stream():
        await doc.reference.delete()

    return {"status": "ok", "session_id": session_id}


