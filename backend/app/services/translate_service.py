from __future__ import annotations

import asyncio
from typing import Dict, Tuple

from google.cloud import translate_v2 as translate_v2

from app.models.schemas import TranslateResponse

SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
}

_client: translate_v2.Client | None = None
_cache: Dict[Tuple[str, str], TranslateResponse] = {}


def _get_client() -> translate_v2.Client:
    global _client
    if _client is None:
        _client = translate_v2.Client()
    return _client


async def translate_text(text: str, target_language: str) -> TranslateResponse:
    if target_language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language: {target_language}")

    key = (text, target_language)
    if key in _cache:
        return _cache[key]

    client = _get_client()

    def _sync_translate() -> TranslateResponse:
        result = client.translate(text, target_language=target_language)
        translated = result.get("translatedText", "")
        detected = (
            result.get("detectedSourceLanguage", "")
            or result.get("sourceLanguage", "")
            or "unknown"
        )
        return TranslateResponse(
            translated_text=translated,
            detected_source=detected,
        )

    response = await asyncio.to_thread(_sync_translate)
    _cache[key] = response
    return response

