from __future__ import annotations

import asyncio
import queue
import threading
from dataclasses import dataclass
from typing import AsyncGenerator, Sequence

import google.generativeai as genai

SYSTEM_PROMPT = """You are CivicMind, a neutral election-process assistant focused on India.

Your job is to explain election procedures clearly and safely.

Rules:
1. Stay strictly non-partisan. Never persuade the user to support or oppose any party or candidate.
2. Explain Indian election processes such as voter enrolment, electoral rolls, EVM/VVPAT, nomination, campaign rules, polling, counting, and government formation.
3. Use plain language and short numbered steps whenever the user asks how a process works.
4. Never invent dates, live results, constituency-specific deadlines, or legal requirements you are not sure about.
5. If the answer depends on current schedules or constituency-specific facts, tell the user to verify through official ECI resources.
6. Keep the answer practical, short, and easy to act on.
7. Use the language requested in the prompt.
"""

RETRYABLE_CLASS_NAMES = {
    "resourceexhausted",
    "toomanyrequests",
    "serviceunavailable",
    "internalservererror",
    "emptygeminiresponseerror",
}
RETRYABLE_ERROR_KEYWORDS = (
    "429",
    "quota",
    "rate limit",
    "resource exhausted",
    "too many requests",
    "temporarily unavailable",
    "model unavailable",
    "service unavailable",
    "overloaded",
)
NON_RETRYABLE_ERROR_KEYWORDS = (
    "invalid api key",
    "api key not valid",
    "permission denied",
    "unauthorized",
    "authentication",
    "invalid argument",
    "malformed",
)


class EmptyGeminiResponseError(RuntimeError):
    """Raised when Gemini returns no text for a prompt."""


@dataclass(frozen=True)
class GeminiGenerationOptions:
    max_output_tokens: int
    temperature: float = 0.2
    top_p: float = 0.8


class GeminiService:
    def __init__(self, *, api_key: str, model_names: Sequence[str]) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        resolved_models = [name.strip() for name in model_names if name.strip()]
        if not resolved_models:
            raise ValueError("At least one Gemini model must be configured")

        genai.configure(api_key=api_key)
        self.model_names = tuple(dict.fromkeys(resolved_models))
        self.models = {
            model_name: genai.GenerativeModel(
                model_name=model_name,
                system_instruction=SYSTEM_PROMPT,
            )
            for model_name in self.model_names
        }

    @property
    def is_ready(self) -> bool:
        return bool(self.models)

    def _build_generation_config(self, options: GeminiGenerationOptions) -> dict[str, float | int]:
        return {
            "temperature": options.temperature,
            "top_p": options.top_p,
            "max_output_tokens": options.max_output_tokens,
        }

    def _should_try_next_model(self, exc: Exception) -> bool:
        class_name = exc.__class__.__name__.lower()
        message = str(exc).lower()
        combined = f"{class_name} {message}"

        if any(keyword in combined for keyword in NON_RETRYABLE_ERROR_KEYWORDS):
            return False
        if class_name in RETRYABLE_CLASS_NAMES:
            return True
        return any(keyword in combined for keyword in RETRYABLE_ERROR_KEYWORDS)

    def _generate_once(self, *, model_name: str, prompt: str, options: GeminiGenerationOptions) -> str:
        response = self.models[model_name].generate_content(
            prompt,
            generation_config=self._build_generation_config(options),
        )
        text = (getattr(response, "text", None) or "").strip()
        if not text:
            raise EmptyGeminiResponseError(f"{model_name} returned an empty response")
        return text

    def _complete_sync(self, *, prompt: str, options: GeminiGenerationOptions) -> str:
        last_error: Exception | None = None

        for index, model_name in enumerate(self.model_names):
            try:
                return self._generate_once(model_name=model_name, prompt=prompt, options=options)
            except Exception as exc:  # pragma: no cover - exercised through tests and runtime
                last_error = exc
                if index < len(self.model_names) - 1 and self._should_try_next_model(exc):
                    continue
                raise

        if last_error is not None:
            raise last_error
        raise RuntimeError("No Gemini models are configured")

    async def complete(
        self,
        prompt: str,
        *,
        max_output_tokens: int,
        temperature: float = 0.2,
        top_p: float = 0.8,
    ) -> str:
        options = GeminiGenerationOptions(
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            top_p=top_p,
        )
        return await asyncio.to_thread(self._complete_sync, prompt=prompt, options=options)

    def _stream_sync(self, *, prompt: str, options: GeminiGenerationOptions) -> Sequence[str]:
        last_error: Exception | None = None

        for index, model_name in enumerate(self.model_names):
            chunks: list[str] = []
            try:
                for chunk in self.models[model_name].generate_content(
                    prompt,
                    stream=True,
                    generation_config=self._build_generation_config(options),
                ):
                    text = getattr(chunk, "text", None)
                    if text:
                        chunks.append(str(text))

                if not chunks:
                    raise EmptyGeminiResponseError(f"{model_name} returned an empty stream")
                return chunks
            except Exception as exc:  # pragma: no cover - exercised through runtime
                last_error = exc
                if index < len(self.model_names) - 1 and self._should_try_next_model(exc):
                    continue
                raise

        if last_error is not None:
            raise last_error
        raise RuntimeError("No Gemini models are configured")

    async def stream(
        self,
        prompt: str,
        *,
        max_output_tokens: int,
        temperature: float = 0.2,
        top_p: float = 0.8,
    ) -> AsyncGenerator[str, None]:
        q: "queue.Queue[str | object]" = queue.Queue()
        sentinel = object()
        options = GeminiGenerationOptions(
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            top_p=top_p,
        )

        def _producer() -> None:
            try:
                for text in self._stream_sync(prompt=prompt, options=options):
                    q.put(text)
            except Exception as exc:
                q.put(f"[ERROR] {exc}")
            finally:
                q.put(sentinel)

        threading.Thread(target=_producer, daemon=True).start()

        loop = asyncio.get_running_loop()
        while True:
            item = await loop.run_in_executor(None, q.get)
            if item is sentinel:
                break
            yield str(item)
