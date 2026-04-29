from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query, Request

from app.models.schemas import (
    ApiResponse,
    DeleteSessionPayload,
    SessionDetailPayload,
    SessionListPayload,
)

router = APIRouter(prefix="/api", tags=["sessions"])

HTML_TAG_RE = re.compile(r"<[^>]*>")


def sanitize_session_id(value: str) -> str:
    return HTML_TAG_RE.sub("", value or "").strip()[:120]


@router.get("/sessions", response_model=ApiResponse[SessionListPayload])
async def list_sessions(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
) -> ApiResponse[SessionListPayload]:
    sessions = await request.app.state.session_store.list_sessions(limit=limit)
    return ApiResponse(data=SessionListPayload(sessions=sessions))


@router.get("/sessions/{session_id}", response_model=ApiResponse[SessionDetailPayload])
async def get_session_detail(
    request: Request,
    session_id: str,
) -> ApiResponse[SessionDetailPayload]:
    cleaned_id = sanitize_session_id(session_id)
    if not cleaned_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    detail = await request.app.state.session_store.get_session_detail(cleaned_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Session not found")

    summary, messages = detail
    return ApiResponse(data=SessionDetailPayload(session=summary, messages=messages))


@router.delete("/sessions/{session_id}", response_model=ApiResponse[DeleteSessionPayload])
async def delete_session(
    request: Request,
    session_id: str,
) -> ApiResponse[DeleteSessionPayload]:
    cleaned_id = sanitize_session_id(session_id)
    if not cleaned_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    deleted = await request.app.state.session_store.delete_session(cleaned_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return ApiResponse(data=DeleteSessionPayload(session_id=cleaned_id, deleted=True))
