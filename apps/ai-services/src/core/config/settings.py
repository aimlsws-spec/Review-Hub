"""Runtime configuration for the AI service.

Every field has a free-by-default value so the service boots and verifies
submissions with zero external accounts or paid API keys. OCR and the LLM
assistant are independently toggleable and both degrade gracefully when the
underlying local tool (Tesseract / Ollama) isn't installed or running.
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Backend integration — matches the AI_SERVICE_API_KEY/SECRET seeded by
    # apps/backend/prisma/seed.ts for local dev.
    backend_base_url: str = "http://localhost:3000/api/v1"
    ai_service_api_key: str = "ai-service-dev"
    ai_service_api_secret: str = "dev-only-secret-change-me"
    request_timeout_seconds: float = 30.0

    # Identifies this worker to the backend and is stored on the job/audit log.
    engine_name: str = "heuristic-ocr"
    engine_model: str = "v1"
    poll_interval_seconds: float = 5.0

    # Mirrors AI_VERIFICATION_THRESHOLDS in the backend so this service's own
    # decision roughly agrees with the backend's final gate — the backend
    # re-checks these independently regardless of what this service reports.
    min_confidence: float = 0.85
    max_fraud_score: float = 0.3

    # OCR (screenshot/proof reading) — free, local, optional. If the Tesseract
    # binary isn't on PATH, set tesseract_cmd or leave OCR to auto-disable.
    ocr_enabled: bool = True
    tesseract_cmd: Optional[str] = None

    # LLM-backed explanation text via a locally-run Ollama instance (free, no
    # API key). Disabled by default; verification works fully without it.
    llm_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.2"

    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000


@lru_cache
def get_settings() -> Settings:
    return Settings()
