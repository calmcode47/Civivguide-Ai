from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.models.schemas import ApiResponse, HealthPayload
from app.routers.assistant import router as assistant_router
from app.routers.chat import router as chat_router
from app.routers.sessions import router as sessions_router
from app.routers.timeline import router as timeline_router
from app.routers.translate import router as translate_router
from app.services.assistant_service import AssistantService
from app.services.config import get_settings
from app.services.gemini_service import GeminiService
from app.services.session_store import build_session_store

VERSION = "2.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    gemini_service = None
    if settings.GEMINI_API_KEY:
        try:
            gemini_service = GeminiService(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
            )
        except Exception:
            gemini_service = None

    app.state.settings = settings
    app.state.session_store = build_session_store(settings)
    app.state.assistant_service = AssistantService(gemini_service)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CivicMind API", version=VERSION, lifespan=lifespan)

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    )
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(chat_router)
    app.include_router(sessions_router)
    app.include_router(assistant_router)
    app.include_router(translate_router)
    app.include_router(timeline_router)

    @app.get("/health", response_model=ApiResponse[HealthPayload], tags=["health"])
    @app.get("/api/health", response_model=ApiResponse[HealthPayload], tags=["health"])
    async def health_check() -> ApiResponse[HealthPayload]:
        active_settings = app.state.settings
        session_store = app.state.session_store
        assistant_service = app.state.assistant_service
        payload = HealthPayload(
            service="civicmind-api",
            version=VERSION,
            environment=active_settings.ENVIRONMENT,
            backend_ready=True,
            gemini_ready=assistant_service.gemini_service is not None,
            firestore_mode=session_store.mode,
            rate_limit_per_minute=active_settings.RATE_LIMIT_PER_MINUTE,
            cloud_project_id=active_settings.GOOGLE_CLOUD_PROJECT or None,
            firestore_project_id=active_settings.FIRESTORE_PROJECT_ID or active_settings.GOOGLE_CLOUD_PROJECT or None,
        )
        return ApiResponse(data=payload)

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
        return await _rate_limit_exceeded_handler(request, exc)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    return app


app = create_app()
