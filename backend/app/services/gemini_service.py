import asyncio
import queue
import threading
from typing import Any, AsyncGenerator, Iterable

import google.generativeai as genai

SYSTEM_PROMPT = """You are CivicMind, an expert assistant for the Indian election process.

You MUST understand the following domains and answer accordingly:
1) Lok Sabha elections, Rajya Sabha elections, and State Assembly elections.
2) Election Commission of India (ECI) processes including Model Code of Conduct (MCC), VVPAT, and EVM.
3) Voter registration processes and the purpose of forms: Form 6, 6A, 6B, 6C, and Form 8.
4) Election phases, nomination, campaign, and counting workflows.

When explaining any process, use NUMBERED STEPS (1., 2., 3., ...).

Never invent dates or deadlines. If dates are required, instruct the user to check official sources at: https://eci.gov.in

Respond in the user's language provided in the prompt. If language is "hi", respond in Hindi; otherwise respond in English.
"""


class GeminiService:
    # Model: gemini-2.0-flash
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("GEMINI_API_KEY not provided")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

    def _format_history(self, history: Iterable[dict[str, Any]]) -> str:
        # Expected history items: {"role": "user"|"assistant", "content": "..."}
        lines: list[str] = []
        for msg in history:
            role = str(msg.get("role", "user"))
            content = str(msg.get("content", "")).strip()
            if not content:
                continue
            if role.lower() == "assistant":
                lines.append(f"Assistant: {content}")
            else:
                lines.append(f"User: {content}")
        return "\n".join(lines)

    def _build_prompt(self, message: str, history: list[dict[str, Any]], language: str) -> str:
        history_text = self._format_history(history)
        safe_language = language if language in {"en", "hi"} else "en"
        if history_text:
            history_part = f"Conversation history:\n{history_text}\n\n"
        else:
            history_part = "Conversation history: (none)\n\n"

        return (
            f'User language: "{safe_language}"\n\n'
            + history_part
            + f"Latest user message:\n{message}\n\n"
            + "Provide a clear, numbered, step-by-step response."
        )

    async def generate_response(
        self, message: str, history: list[dict[str, Any]], language: str
    ) -> str:
        prompt = self._build_prompt(message=message, history=history, language=language)

        def _sync_generate() -> str:
            response = self.model.generate_content(prompt)
            return (getattr(response, "text", None) or "").strip()

        return await asyncio.to_thread(_sync_generate)

    async def stream_response(
        self, message: str, history: list[dict[str, Any]], language: str
    ) -> AsyncGenerator[str, None]:
        prompt = self._build_prompt(message=message, history=history, language=language)

        q: "queue.Queue[str | object]" = queue.Queue()
        done_sentinel = object()

        def _producer() -> None:
            try:
                for chunk in self.model.generate_content(prompt, stream=True):
                    text = getattr(chunk, "text", None)
                    if text:
                        q.put(str(text))
            except Exception as e:
                q.put(f"[ERROR] {str(e)}")
            finally:
                q.put(done_sentinel)

        threading.Thread(target=_producer, daemon=True).start()

        loop = asyncio.get_running_loop()
        while True:
            item = await loop.run_in_executor(None, q.get)
            if item is done_sentinel:
                break
            yield str(item)
