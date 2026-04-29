from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from app.data.election_content import (
    INTENT_KEYWORDS,
    INTENT_NOTES,
    OFFICIAL_RESOURCES,
    PERSONA_HINTS,
    SUGGESTIONS_BY_PERSONA,
)
from app.models.schemas import (
    BallotDecodeRequest,
    OfficialResource,
    VotingPlanRequest,
)
from app.services.gemini_service import GeminiService


@dataclass
class AssistantResult:
    reply: str
    intent: str
    suggestions: list[str]
    sources: list[OfficialResource]


class AssistantService:
    def __init__(
        self,
        gemini_service: GeminiService | None,
        *,
        prompt_history_message_limit: int = 6,
        chat_max_output_tokens: int = 500,
        plan_max_output_tokens: int = 650,
        ballot_max_output_tokens: int = 300,
    ) -> None:
        self.gemini_service = gemini_service
        self.prompt_history_message_limit = max(prompt_history_message_limit, 0)
        self.chat_max_output_tokens = max(chat_max_output_tokens, 1)
        self.plan_max_output_tokens = max(plan_max_output_tokens, 1)
        self.ballot_max_output_tokens = max(ballot_max_output_tokens, 1)

    def normalize_persona(self, user_context: str | None) -> str:
        if not user_context:
            return "general"

        normalized = " ".join(user_context.lower().split())
        if "first" in normalized:
            return "first-time voter"
        if "return" in normalized:
            return "returning voter"
        if "candidate" in normalized:
            return "candidate"
        if "observer" in normalized or "journalist" in normalized:
            return "observer"
        return "general"

    def detect_intent(self, message: str) -> str:
        lowered = message.lower()
        best_intent = "general"
        best_score = 0

        for intent, keywords in INTENT_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in lowered)
            if score > best_score:
                best_intent = intent
                best_score = score

        return best_intent

    def get_suggestions(self, *, persona: str, intent: str) -> list[str]:
        persona_map = SUGGESTIONS_BY_PERSONA.get(persona, {})
        if intent in persona_map:
            return persona_map[intent]

        general_persona_map = SUGGESTIONS_BY_PERSONA.get("general", {})
        if intent in general_persona_map:
            return general_persona_map[intent]

        return persona_map.get("general") or general_persona_map.get("general", [])

    def get_sources(self, intent: str) -> list[OfficialResource]:
        if intent == "results":
            return [OFFICIAL_RESOURCES["eci_results"], OFFICIAL_RESOURCES["eci"]]
        return [OFFICIAL_RESOURCES["voters_portal"], OFFICIAL_RESOURCES["eci"]]

    def _format_history(self, history: Iterable[dict[str, object]]) -> str:
        lines: list[str] = []
        for item in history:
            role = str(item.get("role", "user")).strip().title()
            content = str(item.get("content", "")).strip()
            if content:
                lines.append(f"{role}: {content}")
        return "\n".join(lines) if lines else "(no prior messages)"

    def _chat_prompt(
        self,
        *,
        message: str,
        history: list[dict[str, object]],
        language: str,
        persona: str,
        intent: str,
    ) -> str:
        guidance = PERSONA_HINTS.get(persona, PERSONA_HINTS["general"])
        notes = INTENT_NOTES.get(intent, INTENT_NOTES["general"])
        notes_block = "\n".join(f"- {note}" for note in notes)
        suggestions = self.get_suggestions(persona=persona, intent=intent)
        suggestion_block = "\n".join(f"- {item}" for item in suggestions[:2])

        return f"""
Language: {language}
Persona: {persona}
Detected intent: {intent}

Persona guidance:
{guidance}

Relevant election notes:
{notes_block}

Conversation history:
{self._format_history(history)}

Latest user question:
{message}

Answer requirements:
- Open with one direct sentence for this user.
- Use short numbered steps when explaining a process.
- Keep the answer concise and practical.
- Mention official verification only when the answer depends on live dates, booth assignments, or constituency-specific rules.
- Skip filler, long recaps, and internal reasoning.
- Do not mention internal intent detection.

Useful follow-up directions:
{suggestion_block}
""".strip()

    def _fallback_chat(
        self,
        *,
        message: str,
        persona: str,
        intent: str,
    ) -> str:
        notes = INTENT_NOTES.get(intent, INTENT_NOTES["general"])
        steps = [
            f"1. Start with the official channel most relevant to your case: {OFFICIAL_RESOURCES['voters_portal'].title} for voter services or {OFFICIAL_RESOURCES['eci'].title} for election process updates.",
            f"2. For your situation as a {persona}, focus on this first: {notes[0]}",
            "3. Verify any live date, booth assignment, or constituency-specific instruction through the official portal before acting on it.",
        ]

        if "date" in message.lower() or "deadline" in message.lower():
            steps.append(
                "4. Because dates can change by election and constituency, check the official ECI schedule instead of relying on unofficial forwards or screenshots."
            )

        return (
            "Here is the clearest way to approach this:\n\n"
            + "\n".join(steps)
            + f"\n\nOfficial references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
        )

    async def generate_chat_response(
        self,
        *,
        message: str,
        history: list[dict[str, object]],
        language: str,
        user_context: str,
    ) -> AssistantResult:
        persona = self.normalize_persona(user_context)
        intent = self.detect_intent(message)
        suggestions = self.get_suggestions(persona=persona, intent=intent)
        sources = self.get_sources(intent)
        prompt_history = (
            history[-self.prompt_history_message_limit :]
            if self.prompt_history_message_limit
            else []
        )

        if self.gemini_service is None:
            reply = self._fallback_chat(message=message, persona=persona, intent=intent)
            return AssistantResult(reply=reply, intent=intent, suggestions=suggestions, sources=sources)

        prompt = self._chat_prompt(
            message=message,
            history=prompt_history,
            language=language,
            persona=persona,
            intent=intent,
        )
        try:
            reply = await self.gemini_service.complete(
                prompt,
                max_output_tokens=self.chat_max_output_tokens,
            )
        except Exception:
            reply = self._fallback_chat(message=message, persona=persona, intent=intent)

        return AssistantResult(reply=reply, intent=intent, suggestions=suggestions, sources=sources)

    async def generate_voting_plan(self, payload: VotingPlanRequest) -> AssistantResult:
        sources = [OFFICIAL_RESOURCES["voters_portal"], OFFICIAL_RESOURCES["eci"]]
        suggestions = [
            "How do I verify my polling booth officially?",
            "What should I do if my voter details are incorrect?",
            "Explain what happens at the booth step by step.",
        ]

        prompt = f"""
Language: {payload.language}
Task: Generate a personalised Indian election voting plan in markdown.

User details:
- Registration status: {payload.registration_status}
- Location context: {payload.location_context}
- Planning focus: {payload.planning_focus}

Requirements:
- Give a short title.
- Add a numbered checklist.
- Add a section called "What to verify officially".
- Add a section called "What to carry or confirm".
- Keep the checklist compact and practical.
- Never invent dates.
- Mention ECI or Voters' Service Portal as the official place to verify live details.
""".strip()

        if self.gemini_service is None:
            reply = (
                "## My Voting Plan\n\n"
                "1. Confirm your voter registration status on the Voters' Service Portal.\n"
                "2. Verify your polling booth and any constituency-specific instructions.\n"
                "3. Prepare your identity proof and note your travel or timing plan in advance.\n"
                "4. Re-check official information after the election schedule is announced.\n\n"
                "### What to verify officially\n"
                f"- Booth details: {OFFICIAL_RESOURCES['voters_portal'].url}\n"
                f"- Election process updates: {OFFICIAL_RESOURCES['eci'].url}\n\n"
                "### What to carry or confirm\n"
                "- Your accepted identity proof\n"
                "- Correct voter details\n"
                "- Your expected travel time and backup plan"
            )
        else:
            try:
                reply = await self.gemini_service.complete(
                    prompt,
                    max_output_tokens=self.plan_max_output_tokens,
                )
            except Exception:
                reply = (
                    "## My Voting Plan\n\n"
                    "1. Check your voter status on the official portal.\n"
                    "2. Confirm your booth details before polling day.\n"
                    "3. Prepare your documents and travel plan.\n"
                    "4. Verify any schedule update through ECI.\n"
                )

        return AssistantResult(reply=reply, intent="polling", suggestions=suggestions, sources=sources)

    async def generate_ballot_explanation(self, payload: BallotDecodeRequest) -> AssistantResult:
        sources = [OFFICIAL_RESOURCES["eci"], OFFICIAL_RESOURCES["voters_portal"]]
        suggestions = [
            "Explain EVM and VVPAT in simple words.",
            "What does NOTA mean for a voter?",
            "How do I read candidate information before voting?",
        ]

        prompt = f"""
Language: {payload.language}
Task: Explain an Indian election term in simple language.

Term: {payload.term}
Category: {payload.category}
Context: {payload.context}

Requirements:
- Use 2 short paragraphs in markdown.
- The first paragraph should define the term in very simple language.
- The second paragraph should explain why it matters to a voter or candidate.
- Avoid legal jargon unless you immediately explain it.
- Keep the answer tight and plain-spoken.
""".strip()

        related_terms = ["EVM", "VVPAT", "NOTA", "constituency"]
        if self.gemini_service is None:
            reply = (
                f"**{payload.term}** means: {payload.context}\n\n"
                "Why it matters: understanding this term helps you follow the voting process more confidently and verify information from official election sources."
            )
        else:
            try:
                reply = await self.gemini_service.complete(
                    prompt,
                    max_output_tokens=self.ballot_max_output_tokens,
                )
            except Exception:
                reply = (
                    f"**{payload.term}** means: {payload.context}\n\n"
                    "Why it matters: it helps you understand the ballot or polling process without confusion."
                )

        return AssistantResult(reply=reply, intent="ballot", suggestions=suggestions, sources=sources[:])
