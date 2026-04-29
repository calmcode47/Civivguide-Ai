from __future__ import annotations

from fastapi import APIRouter

from app.data.election_content import OFFICIAL_RESOURCES, TIMELINE_PHASES
from app.models.schemas import ApiResponse, ElectionTimelinePayload

router = APIRouter(prefix="/api", tags=["timeline"])


@router.get("/timeline", response_model=ApiResponse[ElectionTimelinePayload])
async def get_timeline() -> ApiResponse[ElectionTimelinePayload]:
    total_steps = sum(len(phase.steps) for phase in TIMELINE_PHASES)
    payload = ElectionTimelinePayload(
        phases=TIMELINE_PHASES,
        total_steps=total_steps,
        sources=[OFFICIAL_RESOURCES["eci"], OFFICIAL_RESOURCES["voters_portal"]],
    )
    return ApiResponse(data=payload)
