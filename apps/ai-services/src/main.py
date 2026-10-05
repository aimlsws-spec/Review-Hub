"""FastAPI entrypoint. The verification worker runs as a background asyncio
task for the lifetime of the process — there is no separate worker process
to deploy, just this one service.
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from .core.config import get_settings
from .core.logging import configure_logging, get_logger
from .core.models import (
    AssistRequest,
    AssistResponse,
    CaptionRequest,
    CaptionResponse,
    ReviewDraftRequest,
    ReviewDraftResponse,
)
from .core.security import verify_backend_credentials
from .engines import CaptionEngine, KycDocumentEngine, ReviewAssistantEngine, TextAssistEngine, VerificationEngine
from .services import BackendClient, OcrService, OllamaService
from .workers import VerificationWorker

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)

backend_client = BackendClient(settings)
ocr_service = OcrService(settings)
ollama_service = OllamaService(settings)
engine = VerificationEngine(settings, ocr_service, ollama_service)
text_assist_engine = TextAssistEngine(ollama_service)
review_assistant_engine = ReviewAssistantEngine(ollama_service)
caption_engine = CaptionEngine(ollama_service)
kyc_document_engine = KycDocumentEngine(ocr_service)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "AI service starting — ocrAvailable=%s llmAvailable=%s (both optional; core verification works without either)",
        ocr_service.available,
        ollama_service.available,
    )
    yield
    await backend_client.aclose()


app = FastAPI(title="Viralkar AI Services", lifespan=lifespan)


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


@app.post("/v1/assist/review-drafts", response_model=ReviewDraftResponse, dependencies=[Depends(verify_backend_credentials)])
async def review_drafts(request: ReviewDraftRequest) -> ReviewDraftResponse:
    return await review_assistant_engine.draft(request)


@app.post("/v1/assist/captions", response_model=CaptionResponse, dependencies=[Depends(verify_backend_credentials)])
async def captions(request: CaptionRequest) -> CaptionResponse:
    return await caption_engine.generate(request)


from fastapi import UploadFile, File, Form
from .core.models import Submission, VerificationDecision

@app.post("/v1/verify", dependencies=[Depends(verify_backend_credentials)])
async def verify_submission_direct(
    submissionJson: str = Form(...),
    file: UploadFile = File(None)
):
    import json
    submission_data = json.loads(submissionJson)
    submission = Submission(**submission_data)
    
    evidence_bytes = None
    if file:
        evidence_bytes = await file.read()
        
    outcome = await engine.verify(submission, evidence_bytes)
    return {
        "decision": outcome.decision.value,
        "confidence": outcome.confidence,
        "fraudScore": outcome.fraud_score,
        "explanation": outcome.explanation,
        "rawResponse": outcome.raw,
        "perceptualHash": outcome.perceptual_hash,
        "evidenceText": outcome.evidence_text,
    }


@app.post("/v1/kyc/read", dependencies=[Depends(verify_backend_credentials)])
async def read_kyc_document(
    documentType: str = Form(...),
    documentNumber: str = Form(None),
    fullName: str = Form(None),
    file: UploadFile = File(...),
):
    """Checks a KYC image against the typed number and the account holder's name. Returns only match flags."""
    image_bytes = await file.read()
    return kyc_document_engine.read(documentType, documentNumber, fullName, image_bytes).to_dict()
