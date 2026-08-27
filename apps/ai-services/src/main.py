"""FastAPI entrypoint. The verification worker runs as a background asyncio
task for the lifetime of the process — there is no separate worker process
to deploy, just this one service.
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from .core.config import get_settings
from .core.logging import configure_logging, get_logger
from .core.models import AssistRequest, AssistResponse
from .core.security import verify_backend_credentials
from .engines import TextAssistEngine, VerificationEngine
from .services import BackendClient, OcrService, OllamaService
from .workers import VerificationWorker

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)

backend_client = BackendClient(settings)
ocr_service = OcrService(settings)
ollama_service = OllamaService(settings)
engine = VerificationEngine(settings, ocr_service, ollama_service)
worker = VerificationWorker(settings, backend_client, engine)
text_assist_engine = TextAssistEngine(ollama_service)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "AI service starting — ocrAvailable=%s llmAvailable=%s (both optional; core verification works without either)",
        ocr_service.available,
        ollama_service.available,
    )
    worker_task = asyncio.create_task(worker.run_forever())
    yield
    worker.stop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await backend_client.aclose()


app = FastAPI(title="VIRAL KAR AI Services", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ocrAvailable": ocr_service.available,
        "llmAvailable": ollama_service.available,
    }


@app.post("/v1/assist/suggest-text", response_model=AssistResponse, dependencies=[Depends(verify_backend_credentials)])
async def suggest_text(request: AssistRequest) -> AssistResponse:
    return await text_assist_engine.suggest(request)
