from __future__ import annotations

import re
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ApiResponse, ChatReplyPayload, ChatRequest

router = APIRouter(prefix="/api", tags=["chat"])

HTML_TAG_RE = re.compile(r"<[^>]*>")
MAX_MESSAGE_CHARS = 2000


def sanitize_text(value: str, *, max_chars: int = MAX_MESSAGE_CHARS) -> str:
    cleaned = HTML_TAG_RE.sub("", value or "").strip()
    return cleaned[:max_chars]


@router.post("/chat", response_model=ApiResponse[ChatReplyPayload])
async def chat(request: Request, payload: ChatRequest) -> ApiResponse[ChatReplyPayload]:
    message = sanitize_text(payload.message)
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    session_store = request.app.state.session_store
    assistant_service = request.app.state.assistant_service
    settings = request.app.state.settings

    session_id = await session_store.ensure_session(
        payload.session_id,
        language=payload.language,
        user_context=payload.user_context,
    )
    history = await session_store.get_history(session_id, limit=settings.SESSION_HISTORY_LIMIT)

    result = await assistant_service.generate_chat_response(
        message=message,
        history=history,
        language=payload.language,
        user_context=payload.user_context,
    )

    await session_store.add_message(
        session_id,
        role="user",
        content=message,
        language=payload.language,
        intent=result.intent,
    )
    await session_store.add_message(
        session_id,
        role="assistant",
        content=result.reply,
        language=payload.language,
        intent=result.intent,
    )

    return ApiResponse(
        data=ChatReplyPayload(
            session_id=session_id,
            reply=result.reply,
            intent=result.intent,
            suggestions=result.suggestions,
            sources=result.sources,
        )
    )


@router.post("/chat/stream")
async def chat_stream(request: Request, payload: ChatRequest) -> StreamingResponse:
    message = sanitize_text(payload.message)
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    session_store = request.app.state.session_store
    assistant_service = request.app.state.assistant_service
    settings = request.app.state.settings

    session_id = await session_store.ensure_session(
        payload.session_id,
        language=payload.language,
        user_context=payload.user_context,
    )
    history = await session_store.get_history(session_id, limit=settings.SESSION_HISTORY_LIMIT)
    result = await assistant_service.generate_chat_response(
        message=message,
        history=history,
        language=payload.language,
        user_context=payload.user_context,
    )

    async def event_generator() -> AsyncGenerator[str, None]:
        yield f"data: {result.reply}\n\n"
        await session_store.add_message(
            session_id,
            role="user",
            content=message,
            language=payload.language,
            intent=result.intent,
        )
        await session_store.add_message(
            session_id,
            role="assistant",
            content=result.reply,
            language=payload.language,
            intent=result.intent,
        )
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
