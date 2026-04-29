from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from app.models.schemas import ApiResponse, TranslatePayload, TranslateRequest
from app.services.translate_service import SUPPORTED_LANGUAGES, translate_text

router = APIRouter(prefix="/api", tags=["translate"])

HTML_TAG_RE = re.compile(r"<[^>]*>")


def sanitize_text(value: str) -> str:
    return HTML_TAG_RE.sub("", value or "").strip()[:2000]


@router.post("/translate", response_model=ApiResponse[TranslatePayload])
async def translate(payload: TranslateRequest) -> ApiResponse[TranslatePayload]:
    text = sanitize_text(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="text cannot be empty")

    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {payload.target_language}",
        )

    try:
        translated = await translate_text(text, payload.target_language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ApiResponse(
        data=TranslatePayload(
            translated_text=translated.translated_text,
            detected_source=translated.detected_source,
        )
    )
