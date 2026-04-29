from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.models.schemas import (
    ApiResponse,
    BallotDecodePayload,
    BallotDecodeRequest,
    FeedbackPayload,
    FeedbackRequest,
    SuggestionsPayload,
    VotingPlanPayload,
    VotingPlanRequest,
)

router = APIRouter(prefix="/api", tags=["assistant"])


@router.get("/suggestions", response_model=ApiResponse[SuggestionsPayload])
async def get_suggestions(
    request: Request,
    persona: str = Query(default="general"),
    language: str = Query(default="en"),
) -> ApiResponse[SuggestionsPayload]:
    assistant_service = request.app.state.assistant_service
    normalized_persona = assistant_service.normalize_persona(persona)
    suggestions = assistant_service.get_suggestions(persona=normalized_persona, intent="general")
    return ApiResponse(
        data=SuggestionsPayload(
            persona=normalized_persona,
            language=language if language in {"en", "hi"} else "en",
            suggestions=suggestions,
        )
    )


@router.post("/voting-plan", response_model=ApiResponse[VotingPlanPayload])
async def create_voting_plan(
    request: Request,
    payload: VotingPlanRequest,
) -> ApiResponse[VotingPlanPayload]:
    result = await request.app.state.assistant_service.generate_voting_plan(payload)
    return ApiResponse(
        data=VotingPlanPayload(
            plan_markdown=result.reply,
            suggestions=result.suggestions,
            sources=result.sources,
        )
    )


@router.post("/ballot/decode", response_model=ApiResponse[BallotDecodePayload])
async def decode_ballot_term(
    request: Request,
    payload: BallotDecodeRequest,
) -> ApiResponse[BallotDecodePayload]:
    result = await request.app.state.assistant_service.generate_ballot_explanation(payload)
    related_terms = ["NOTA", "VVPAT", "constituency", "candidate symbol"]
    return ApiResponse(
        data=BallotDecodePayload(
            explanation=result.reply,
            related_terms=related_terms,
            sources=result.sources,
        )
    )


@router.post("/feedback", response_model=ApiResponse[FeedbackPayload])
async def save_feedback(
    request: Request,
    payload: FeedbackRequest,
) -> ApiResponse[FeedbackPayload]:
    await request.app.state.session_store.save_feedback(
        payload.session_id,
        payload.rating,
        payload.comment,
    )
    return ApiResponse(data=FeedbackPayload(saved=True))
