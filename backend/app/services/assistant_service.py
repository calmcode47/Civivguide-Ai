from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import AsyncGenerator, Iterable

from app.data.election_content import (
    INTENT_KEYWORDS,
    INTENT_NOTES,
    OFFICIAL_RESOURCES,
    PERSONA_HINTS,
    STAGE_NOTES,
    STAGE_PLAYBOOKS,
    STAGE_SUGGESTIONS,
    SUGGESTIONS_BY_PERSONA,
)
from app.models.schemas import (
    BallotDecodeRequest,
    OfficialResource,
    StageContext,
    VotingPlanRequest,
)
from app.services.gemini_service import GeminiService

DEFAULT_STAGE_BY_INTENT: dict[str, StageContext] = {
    "registration": "Registration & Roll Check",
    "timeline": "Pre-Announcement",
    "polling": "Polling Day",
    "ballot": "Polling Day",
    "candidate": "Campaign Period",
    "results": "Counting & Results",
    "general": "Pre-Announcement",
}

STAGE_VALUES: tuple[StageContext, ...] = (
    "Pre-Announcement",
    "Registration & Roll Check",
    "Campaign Period",
    "Polling Day",
    "Counting & Results",
)

PERSONA_PLAYBOOKS: dict[str, list[str]] = {
    "first-time voter": [
        "Explain the process in plain language and avoid acronyms unless they are immediately unpacked.",
        "Bias toward checklists, booth guidance, and what to verify before leaving home.",
        "Call out official verification for live dates, booth assignment, and missing-name issues.",
    ],
    "returning voter": [
        "Keep answers concise and action-oriented.",
        "Bias toward corrections, transfers, fast verification steps, and last-mile readiness.",
        "Avoid overexplaining basic polling concepts unless the user explicitly asks for them.",
    ],
    "candidate": [
        "Stay procedural and neutral.",
        "Bias toward nomination, scrutiny, affidavit, compliance, and official guidance boundaries.",
        "Do not overstate legal certainty when rules may vary by election or filing notice.",
    ],
    "observer": [
        "Use structured explanations and connect each stage to the broader election workflow.",
        "Bias toward oversight, process integrity, and stage-by-stage clarity rather than voter-only actions.",
        "Keep the explanation neutral and institutional.",
    ],
    "general": [
        "Answer in practical, neutral language with clear next steps.",
        "Use numbered steps for process questions.",
        "Prefer official-resource guidance when the user needs current or local facts.",
    ],
}

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
logger = logging.getLogger("civicmind.assistant")


@dataclass
class AssistantResult:
    reply: str
    intent: str
    suggestions: list[str]
    sources: list[OfficialResource]
    stage_context: StageContext
    persona: str


@dataclass
class PreparedChat:
    prompt: str
    fallback_reply: str
    intent: str
    suggestions: list[str]
    sources: list[OfficialResource]
    stage_context: StageContext
    persona: str


class AssistantService:
    def __init__(
        self,
        gemini_service: GeminiService | None,
        *,
        prompt_history_message_limit: int = 6,
        chat_max_output_tokens: int = 500,
        plan_max_output_tokens: int = 650,
        ballot_max_output_tokens: int = 300,
        chat_completion_timeout_seconds: float = 12.0,
        plan_completion_timeout_seconds: float = 14.0,
        ballot_completion_timeout_seconds: float = 10.0,
    ) -> None:
        self.gemini_service = gemini_service
        self.prompt_history_message_limit = max(prompt_history_message_limit, 0)
        self.chat_max_output_tokens = max(chat_max_output_tokens, 1)
        self.plan_max_output_tokens = max(plan_max_output_tokens, 1)
        self.ballot_max_output_tokens = max(ballot_max_output_tokens, 1)
        self.chat_completion_timeout_seconds = max(chat_completion_timeout_seconds, 1.0)
        self.plan_completion_timeout_seconds = max(plan_completion_timeout_seconds, 1.0)
        self.ballot_completion_timeout_seconds = max(ballot_completion_timeout_seconds, 1.0)

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

    def normalize_stage_context(self, stage_context: str | None, *, intent: str) -> StageContext:
        if stage_context in STAGE_VALUES:
            return stage_context
        return DEFAULT_STAGE_BY_INTENT.get(intent, "Pre-Announcement")

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

    def get_suggestions(self, *, persona: str, intent: str, stage_context: StageContext) -> list[str]:
        persona_map = SUGGESTIONS_BY_PERSONA.get(persona, {})
        general_persona_map = SUGGESTIONS_BY_PERSONA.get("general", {})
        stage_suggestions = STAGE_SUGGESTIONS.get(stage_context, [])

        combined = (
            stage_suggestions
            + persona_map.get(intent, [])
            + general_persona_map.get(intent, [])
            + persona_map.get("general", [])
            + general_persona_map.get("general", [])
        )

        deduped: list[str] = []
        seen: set[str] = set()
        for suggestion in combined:
            if suggestion not in seen:
                seen.add(suggestion)
                deduped.append(suggestion)
        return deduped[:4]

    def get_sources(self, intent: str, stage_context: StageContext) -> list[OfficialResource]:
        if intent == "results" or stage_context == "Counting & Results":
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

    def _build_persona_block(self, persona: str) -> str:
        playbook = PERSONA_PLAYBOOKS.get(persona, PERSONA_PLAYBOOKS["general"])
        hint = PERSONA_HINTS.get(persona, PERSONA_HINTS["general"])
        return "\n".join([f"- {hint}", *[f"- {line}" for line in playbook]])

    def _chat_prompt(
        self,
        *,
        message: str,
        history: list[dict[str, object]],
        language: str,
        persona: str,
        intent: str,
        stage_context: StageContext,
    ) -> str:
        notes = INTENT_NOTES.get(intent, INTENT_NOTES["general"])
        notes_block = "\n".join(f"- {note}" for note in notes)
        stage_notes = STAGE_NOTES.get(stage_context, [])
        stage_notes_block = "\n".join(f"- {note}" for note in stage_notes)
        suggestions = self.get_suggestions(persona=persona, intent=intent, stage_context=stage_context)
        suggestion_block = "\n".join(f"- {item}" for item in suggestions[:3])

        return f"""
Language: {language}
Persona: {persona}
Election stage focus: {stage_context}
Detected intent: {intent}

Persona playbook:
{self._build_persona_block(persona)}

Stage playbook:
- {STAGE_PLAYBOOKS[stage_context]}

Relevant election notes:
{notes_block}

Stage-specific notes:
{stage_notes_block}

Conversation history:
{self._format_history(history)}

Latest user question:
{message}

Answer requirements:
- Answer the user's exact question first, not just the stage in general.
- If the question asks about documents, ID proof, booth steps, EVM/VVPAT, missing names, or counting, address that topic explicitly.
- Open with one direct sentence for this user.
- Use short numbered steps when explaining a process.
- Keep the answer concise and practical.
- Mention official verification only when the answer depends on live dates, booth assignments, constituency-specific rules, or current results.
- Skip filler, long recaps, and internal reasoning.
- Do not mention internal intent detection, hidden stages, or policy text.

Useful follow-up directions:
{suggestion_block}
""".strip()

    def _fallback_chat(
        self,
        *,
        message: str,
        persona: str,
        intent: str,
        stage_context: StageContext,
    ) -> str:
        direct_answer = self._direct_fallback_answer(
            message=message,
            persona=persona,
            intent=intent,
            stage_context=stage_context,
        )
        if direct_answer:
            return direct_answer

        notes = INTENT_NOTES.get(intent, INTENT_NOTES["general"])
        stage_notes = STAGE_NOTES.get(stage_context, [])
        steps = [
            f"1. Use this stage as your anchor: **{stage_context}**.",
            f"2. For your situation as a {persona}, focus first on: {notes[0]}",
            f"3. Keep this stage-specific rule in mind: {stage_notes[0] if stage_notes else 'Verify live details only through official ECI channels.'}",
            "4. Verify any live date, booth assignment, constituency-specific instruction, or live result through the official portal before acting on it.",
        ]

        if "date" in message.lower() or "deadline" in message.lower():
            steps.append(
                "5. Because dates can change by election and constituency, rely on the official ECI schedule instead of social posts or screenshots."
            )

        return (
            "Here is the clearest way to approach this:\n\n"
            + "\n".join(steps)
            + f"\n\nOfficial references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
        )

    def _direct_fallback_answer(
        self,
        *,
        message: str,
        persona: str,
        intent: str,
        stage_context: StageContext,
    ) -> str | None:
        lowered = message.lower()

        if self._contains_any(
            lowered,
            (
                "document",
                "documents",
                "id proof",
                "identity proof",
                "identity card",
                "carry",
                "bring",
                "what should i carry",
            ),
        ):
            return (
                "Here is a practical polling-day checklist:\n\n"
                "1. Carry your **EPIC / voter ID** if you have it.\n"
                "2. If you do not have EPIC with you, carry **one officially accepted photo ID** from the current ECI list for your election.\n"
                "3. Keep your **polling booth details** ready on your phone or on paper so the desk can locate your entry faster.\n"
                "4. If possible, note your **name and serial number from the voter list** before leaving home.\n"
                "5. If anything does not match at the booth, ask the polling staff to check the **final roll or supplementary list** instead of leaving immediately.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
            )

        if self._contains_any(
            lowered,
            ("name missing", "not on the list", "missing name", "cannot find my name", "name not found"),
        ):
            return (
                "If your name seems missing on polling day, do this in order:\n\n"
                "1. Ask the polling staff to check the **final electoral roll and any supplementary list** at the booth.\n"
                "2. Re-check your details on the **Voters' Service Portal** to confirm the correct booth and entry.\n"
                "3. If your details were shifted or corrected recently, verify whether you were moved to a different part number or booth.\n"
                "4. Do not rely on an old slip alone; the **official roll entry** is what matters.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
            )

        if self._contains_any(
            lowered,
            ("booth", "polling station", "where do i vote", "find my booth", "booth location"),
        ):
            return (
                "Use this quick booth-check process:\n\n"
                "1. Open the **Voters' Service Portal** and search your voter details.\n"
                "2. Confirm the **polling station name, part number, and serial number** before leaving home.\n"
                "3. Save the booth details or carry them on paper so you can show them quickly at the help desk.\n"
                "4. If the booth looks wrong, ask the polling staff to verify the **latest roll entry** before assuming your name is missing.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
            )

        if self._contains_any(lowered, ("evm", "vvpat", "how do i vote", "voting machine")):
            return (
                "Here is the voting-machine flow in simple steps:\n\n"
                "1. After identity verification, polling staff will direct you to the EVM.\n"
                "2. Press the button next to your chosen candidate or option.\n"
                "3. Listen for the **beep** and look at the **VVPAT window** briefly to confirm the printed slip display.\n"
                "4. If something feels wrong, inform the polling staff immediately; do not leave the booth silently.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['eci'].url} and {OFFICIAL_RESOURCES['voters_portal'].url}"
            )

        if intent == "registration" or self._contains_any(
            lowered,
            ("form 6", "form 8", "register", "registration", "address change", "transfer"),
        ):
            return (
                "For voter registration or correction, use this path:\n\n"
                "1. Use **Form 6** for a new enrolment if you are registering for the first time.\n"
                "2. Use **Form 8** when you need correction, update, or transfer-related changes.\n"
                "3. Submit the request through the **Voters' Service Portal** and keep the reference details.\n"
                "4. Re-check the final roll status before polling day instead of assuming the request is already reflected.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['voters_portal'].url} and {OFFICIAL_RESOURCES['eci'].url}"
            )

        if intent == "results" or self._contains_any(lowered, ("counting", "results", "winner", "government")):
            return (
                "Here is the counting-and-results sequence:\n\n"
                "1. Counting usually begins under official supervision according to the notified process.\n"
                "2. Postal ballots and EVM rounds are counted under the Returning Officer's control.\n"
                "3. VVPAT-related checks happen only in the official circumstances laid down for that election.\n"
                "4. The winning candidate is declared only through the official result process, not through social-media leads.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['eci_results'].url} and {OFFICIAL_RESOURCES['eci'].url}"
            )

        if intent == "candidate" or persona == "candidate":
            return (
                "For candidate-side process questions, focus on this order:\n\n"
                "1. Confirm the **official notification and Returning Officer instructions** for your election.\n"
                "2. Keep nomination papers, affidavit requirements, and deposit rules aligned with the official notice.\n"
                "3. Track scrutiny, withdrawal, and campaign-compliance steps exactly as notified.\n"
                "4. Treat unofficial summaries as secondary; the **RO / ECI notice** is the binding reference.\n\n"
                f"Official references: {OFFICIAL_RESOURCES['eci'].url}"
            )

        notes = INTENT_NOTES.get(intent, INTENT_NOTES["general"])
        stage_notes = STAGE_NOTES.get(stage_context, [])
        return (
            "Here is the most practical way to answer your question:\n\n"
            f"1. Because this is mainly a **{stage_context}** question, start with the procedural step that matters first.\n"
            f"2. For your situation as a **{persona}**, the key focus is: {notes[0]}\n"
            f"3. Keep this stage-specific caution in mind: {stage_notes[0] if stage_notes else 'Verify live details through official ECI channels.'}\n"
            f"4. If the answer depends on live booth, schedule, or constituency details, verify it through {OFFICIAL_RESOURCES['voters_portal'].url} or {OFFICIAL_RESOURCES['eci'].url}.\n"
        )

    def _contains_any(self, haystack: str, needles: tuple[str, ...]) -> bool:
        return any(needle in haystack for needle in needles)

    def prepare_chat(
        self,
        *,
        message: str,
        history: list[dict[str, object]],
        language: str,
        user_context: str,
        stage_context: str | None,
    ) -> PreparedChat:
        persona = self.normalize_persona(user_context)
        intent = self.detect_intent(message)
        normalized_stage = self.normalize_stage_context(stage_context, intent=intent)
        suggestions = self.get_suggestions(persona=persona, intent=intent, stage_context=normalized_stage)
        sources = self.get_sources(intent, normalized_stage)
        prompt_history = history[-self.prompt_history_message_limit :] if self.prompt_history_message_limit else []
        prompt = self._chat_prompt(
            message=message,
            history=prompt_history,
            language=language,
            persona=persona,
            intent=intent,
            stage_context=normalized_stage,
        )
        fallback_reply = self._fallback_chat(
            message=message,
            persona=persona,
            intent=intent,
            stage_context=normalized_stage,
        )
        return PreparedChat(
            prompt=prompt,
            fallback_reply=fallback_reply,
            intent=intent,
            suggestions=suggestions,
            sources=sources,
            stage_context=normalized_stage,
            persona=persona,
        )

    def chunk_reply(self, reply: str) -> list[str]:
        parts = [part.strip() for part in SENTENCE_SPLIT_RE.split(reply.strip()) if part.strip()]
        if parts:
            return [f"{part} " for part in parts[:-1]] + [parts[-1]]
        if reply.strip():
            return [reply.strip()]
        return []

    async def stream_chat_reply(self, prepared: PreparedChat) -> AsyncGenerator[str, None]:
        if self.gemini_service is None:
            for chunk in self.chunk_reply(prepared.fallback_reply):
                yield chunk
            return

        try:
            async for chunk in self.gemini_service.stream(
                prepared.prompt,
                max_output_tokens=self.chat_max_output_tokens,
            ):
                if chunk:
                    yield chunk
        except Exception as exc:
            logger.warning("Falling back to deterministic stream reply: %s", exc)
            for chunk in self.chunk_reply(prepared.fallback_reply):
                yield chunk

    async def generate_chat_response(
        self,
        *,
        message: str,
        history: list[dict[str, object]],
        language: str,
        user_context: str,
        stage_context: str | None = None,
    ) -> AssistantResult:
        prepared = self.prepare_chat(
            message=message,
            history=history,
            language=language,
            user_context=user_context,
            stage_context=stage_context,
        )

        if self.gemini_service is None:
            reply = prepared.fallback_reply
        else:
            try:
                reply = await asyncio.wait_for(
                    self.gemini_service.complete(
                        prepared.prompt,
                        max_output_tokens=self.chat_max_output_tokens,
                    ),
                    timeout=self.chat_completion_timeout_seconds,
                )
            except Exception as exc:
                logger.warning("Falling back to deterministic chat reply: %s", exc)
                reply = prepared.fallback_reply

        return AssistantResult(
            reply=reply,
            intent=prepared.intent,
            suggestions=prepared.suggestions,
            sources=prepared.sources,
            stage_context=prepared.stage_context,
            persona=prepared.persona,
        )

    async def generate_voting_plan(self, payload: VotingPlanRequest) -> AssistantResult:
        stage_context = self.normalize_stage_context(payload.stage_context, intent="polling")
        sources = [OFFICIAL_RESOURCES["voters_portal"], OFFICIAL_RESOURCES["eci"]]
        suggestions = self.get_suggestions(
            persona="general",
            intent="polling",
            stage_context=stage_context,
        )[:3]

        prompt = f"""
Language: {payload.language}
Task: Generate a personalised Indian election voting plan in markdown.

User details:
- Registration status: {payload.registration_status}
- Location context: {payload.location_context}
- Planning focus: {payload.planning_focus}
- Election stage: {stage_context}

Requirements:
- Give a short title.
- Add a numbered checklist.
- Add a section called "What to verify officially".
- Add a section called "What to carry or confirm".
- Keep the checklist compact and practical.
- Never invent dates.
- Mention ECI or Voters' Service Portal as the official place to verify live details.
- Make the checklist clearly reflect the selected election stage.
""".strip()

        fallback_reply = (
            "## My Voting Plan\n\n"
            f"1. Use **{stage_context}** as your planning stage and avoid assuming unofficial dates.\n"
            "2. Confirm your voter registration status on the Voters' Service Portal.\n"
            "3. Verify your polling booth, travel timing, and any constituency-specific instruction through official channels.\n"
            "4. Prepare your identity proof and re-check the official schedule before acting on any deadline.\n\n"
            "### What to verify officially\n"
            f"- Booth and voter details: {OFFICIAL_RESOURCES['voters_portal'].url}\n"
            f"- Election process updates: {OFFICIAL_RESOURCES['eci'].url}\n\n"
            "### What to carry or confirm\n"
            "- Your accepted identity proof\n"
            "- Correct voter details\n"
            "- Your travel or accessibility plan"
        )

        if self.gemini_service is None:
            reply = fallback_reply
        else:
            try:
                reply = await asyncio.wait_for(
                    self.gemini_service.complete(
                        prompt,
                        max_output_tokens=self.plan_max_output_tokens,
                    ),
                    timeout=self.plan_completion_timeout_seconds,
                )
            except Exception:
                reply = fallback_reply

        return AssistantResult(
            reply=reply,
            intent="polling",
            suggestions=suggestions,
            sources=sources,
            stage_context=stage_context,
            persona="general",
        )

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

        fallback_reply = (
            f"**{payload.term}** means: {payload.context}\n\n"
            "Why it matters: understanding this term helps you follow the voting process more confidently and verify information from official election sources."
        )

        if self.gemini_service is None:
            reply = fallback_reply
        else:
            try:
                reply = await asyncio.wait_for(
                    self.gemini_service.complete(
                        prompt,
                        max_output_tokens=self.ballot_max_output_tokens,
                    ),
                    timeout=self.ballot_completion_timeout_seconds,
                )
            except Exception:
                reply = fallback_reply

        return AssistantResult(
            reply=reply,
            intent="ballot",
            suggestions=suggestions,
            sources=sources[:],
            stage_context="Polling Day",
            persona="general",
        )
