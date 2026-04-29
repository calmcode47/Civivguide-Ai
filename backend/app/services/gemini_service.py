from __future__ import annotations

import asyncio
import queue
import threading
from typing import AsyncGenerator

import google.generativeai as genai

SYSTEM_PROMPT = """You are CivicMind, a neutral election-process assistant focused on India.

Your job is to explain election procedures clearly and safely.

Rules:
1. Stay strictly non-partisan. Never persuade the user to support or oppose any party or candidate.
2. Explain Indian election processes such as voter enrolment, electoral rolls, EVM/VVPAT, nomination, campaign rules, polling, counting, and government formation.
3. Use plain language with numbered steps whenever the user asks how a process works.
4. Never invent dates, live results, constituency-specific deadlines, or legal requirements you are not sure about.
5. If the answer depends on current schedules or constituency-specific facts, tell the user to verify through official ECI resources.
6. Keep the answer practical, short, and easy to act on.
7. Use the language requested in the prompt.
"""


class GeminiService:
    def __init__(self, *, api_key: str, model_name: str) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=SYSTEM_PROMPT,
        )

    async def complete(self, prompt: str) -> str:
        def _generate() -> str:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "max_output_tokens": 900,
                },
            )
            return (getattr(response, "text", None) or "").strip()

        return await asyncio.to_thread(_generate)

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        q: "queue.Queue[str | object]" = queue.Queue()
        sentinel = object()

        def _producer() -> None:
            try:
                for chunk in self.model.generate_content(
                    prompt,
                    stream=True,
                    generation_config={
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "max_output_tokens": 900,
                    },
                ):
                    text = getattr(chunk, "text", None)
                    if text:
                        q.put(str(text))
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
