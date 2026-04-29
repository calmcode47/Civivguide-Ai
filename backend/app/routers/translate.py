from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from app.models.schemas import TranslateRequest, TranslateResponse
from app.services.translate_service import SUPPORTED_LANGUAGES, translate_text

router = APIRouter(prefix="/api", tags=["translate"])

_HTML_TAG_RE = re.compile(r"<[^>]*>")
MAX_TEXT_CHARS = 2000


def sanitize_input(text: str, *, max_chars: int = MAX_TEXT_CHARS) -> str:
    cleaned = _HTML_TAG_RE.sub("", text or "")
    cleaned = cleaned.strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


@router.post("/translate", response_model=TranslateResponse)
async def translate(payload: TranslateRequest) -> TranslateResponse:
    text = sanitize_input(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="text cannot be empty")

    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {payload.target_language}",
        )

    try:
        return await translate_text(text, payload.target_language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


