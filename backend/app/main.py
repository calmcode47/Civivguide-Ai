from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from google.cloud import firestore
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.extension import _rate_limit_exceeded_handler

from app.routers.chat import router as chat_router
from app.routers.timeline import router as timeline_router
from app.routers.translate import router as translate_router
from app.services.config import get_settings
from app.services.gemini_service import GeminiService

VERSION = "1.0.0"

try:
    settings = get_settings()
except Exception:
    # Allow the module to be imported (and `/health` to work) even if
    # env vars / `.env` aren't present in the current environment.
    class _FallbackSettings:  # noqa: N801
        ALLOWED_ORIGINS = ["http://localhost:3000"]
        RATE_LIMIT_PER_MINUTE = 30
        GEMINI_API_KEY = ""
        GOOGLE_CLOUD_PROJECT = ""

    settings = _FallbackSettings()

app = FastAPI(title="CivicMind API", version=VERSION)

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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(translate_router)
app.include_router(timeline_router)


@app.on_event("startup")
async def startup_event() -> None:
    app.state.firestore_client = firestore.Client(
        project=settings.GOOGLE_CLOUD_PROJECT
    )
    app.state.gemini_service = GeminiService(api_key=settings.GEMINI_API_KEY)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "civicmind-api", "version": VERSION}


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return await _rate_limit_exceeded_handler(request, exc)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})
