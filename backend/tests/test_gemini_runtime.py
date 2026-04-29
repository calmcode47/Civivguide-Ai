from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.models.schemas import BallotDecodeRequest, VotingPlanRequest
from app.services.assistant_service import AssistantService
from app.services.gemini_service import GeminiService


class ResourceExhausted(Exception):
    """Retryable quota-style error."""


class FakeModel:
    def __init__(self, model_name: str, behaviors: dict[str, list[object]]) -> None:
        self.model_name = model_name
        self.behaviors = behaviors
        self.calls: list[dict[str, object]] = []

    def generate_content(
        self,
        prompt: str,
        generation_config: dict[str, object] | None = None,
        stream: bool = False,
    ) -> object:
        self.calls.append(
            {
                "prompt": prompt,
                "generation_config": generation_config or {},
                "stream": stream,
            }
        )
        behavior = self.behaviors[self.model_name].pop(0)
        if isinstance(behavior, Exception):
            raise behavior
        if stream:
            return [SimpleNamespace(text=str(behavior))]
        return SimpleNamespace(text=str(behavior))


class FakeGeminiFactory:
    def __init__(self, behaviors: dict[str, list[object]]) -> None:
        self.behaviors = {name: list(items) for name, items in behaviors.items()}
        self.instances: dict[str, FakeModel] = {}
        self.configured_keys: list[str] = []

    def configure(self, *, api_key: str) -> None:
        self.configured_keys.append(api_key)

    def build_model(self, *, model_name: str, system_instruction: str) -> FakeModel:
        model = FakeModel(model_name, self.behaviors)
        self.instances[model_name] = model
        return model


def install_fake_gemini(monkeypatch: pytest.MonkeyPatch, factory: FakeGeminiFactory) -> None:
    monkeypatch.setattr("app.services.gemini_service.genai.configure", factory.configure)
    monkeypatch.setattr(
        "app.services.gemini_service.genai.GenerativeModel",
        lambda model_name, system_instruction: factory.build_model(
            model_name=model_name,
            system_instruction=system_instruction,
        ),
    )


@pytest.mark.asyncio
async def test_gemini_service_uses_primary_model_when_it_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    factory = FakeGeminiFactory(
        {
            "gemini-2.0-flash": ["Primary answer"],
            "gemini-1.5-flash": ["Secondary answer"],
        }
    )
    install_fake_gemini(monkeypatch, factory)

    service = GeminiService(
        api_key="test-key",
        model_names=["gemini-2.0-flash", "gemini-1.5-flash"],
    )
    result = await service.complete("Explain Form 6", max_output_tokens=321)

    assert result == "Primary answer"
    assert factory.configured_keys == ["test-key"]
    assert factory.instances["gemini-2.0-flash"].calls[0]["generation_config"]["max_output_tokens"] == 321
    assert factory.instances["gemini-1.5-flash"].calls == []


@pytest.mark.asyncio
async def test_gemini_service_falls_back_to_secondary_model_on_retryable_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    factory = FakeGeminiFactory(
        {
            "gemini-2.0-flash": [ResourceExhausted("quota exceeded")],
            "gemini-1.5-flash": ["Fallback answer"],
        }
    )
    install_fake_gemini(monkeypatch, factory)

    service = GeminiService(
        api_key="test-key",
        model_names=["gemini-2.0-flash", "gemini-1.5-flash"],
    )
    result = await service.complete("Explain VVPAT", max_output_tokens=222)

    assert result == "Fallback answer"
    assert len(factory.instances["gemini-2.0-flash"].calls) == 1
    assert len(factory.instances["gemini-1.5-flash"].calls) == 1


@pytest.mark.asyncio
async def test_assistant_service_uses_deterministic_fallback_when_all_models_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    factory = FakeGeminiFactory(
        {
            "gemini-2.0-flash": [ResourceExhausted("quota exceeded")],
            "gemini-1.5-flash": [ResourceExhausted("still quota exceeded")],
        }
    )
    install_fake_gemini(monkeypatch, factory)

    service = GeminiService(
        api_key="test-key",
        model_names=["gemini-2.0-flash", "gemini-1.5-flash"],
    )
    assistant = AssistantService(service)

    result = await assistant.generate_chat_response(
        message="How do I check if I am registered to vote?",
        history=[],
        language="en",
        user_context="First-Time Voter",
    )

    assert result.intent == "registration"
    assert result.reply.startswith("Here is the clearest way to approach this:")
    assert "https://voters.eci.gov.in/" in result.reply


class RecorderGeminiService:
    def __init__(self) -> None:
        self.max_output_tokens: list[int] = []

    async def complete(self, prompt: str, *, max_output_tokens: int, **_: object) -> str:
        self.max_output_tokens.append(max_output_tokens)
        return "Stub response"


@pytest.mark.asyncio
async def test_assistant_service_uses_task_specific_token_limits() -> None:
    recorder = RecorderGeminiService()
    assistant = AssistantService(
        recorder,  # type: ignore[arg-type]
        chat_max_output_tokens=111,
        plan_max_output_tokens=222,
        ballot_max_output_tokens=333,
    )

    await assistant.generate_chat_response(
        message="What happens during scrutiny?",
        history=[{"role": "user", "content": "Old context"}],
        language="en",
        user_context="Returning Voter",
    )
    await assistant.generate_voting_plan(
        VotingPlanRequest(
            registration_status="Already registered and mostly ready",
            location_context="Voting from my home constituency",
            planning_focus="Booth verification and document checklist",
            language="en",
        )
    )
    await assistant.generate_ballot_explanation(
        BallotDecodeRequest(
            term="VVPAT",
            context="The paper audit trail display linked to the voting machine.",
            category="technology",
            language="en",
        )
    )

    assert recorder.max_output_tokens == [111, 222, 333]
