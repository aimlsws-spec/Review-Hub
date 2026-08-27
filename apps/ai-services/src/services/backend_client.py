"""HTTP client for the NestJS backend's internal AI-verification API.

Implements the exact 4-endpoint contract exposed by
apps/backend/src/modules/ai/controllers/ai-verification.controller.ts,
authenticated the same way as any other service-to-service API-key
integration in this platform (X-Api-Key / X-Api-Secret headers).
"""
from typing import Optional

import httpx

from ..core.config import Settings
from ..core.exceptions import NoEvidenceFileError
from ..core.models import CompleteJobRequest, VerificationJob


class BackendClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.backend_base_url,
            headers={
                "X-Api-Key": settings.ai_service_api_key,
                "X-Api-Secret": settings.ai_service_api_secret,
            },
            timeout=settings.request_timeout_seconds,
        )

    async def claim_next_job(self) -> Optional[VerificationJob]:
        response = await self._client.get(
            "/internal/ai/verification-jobs/next",
            params={"engine": self._settings.engine_name, "model": self._settings.engine_model},
        )
        response.raise_for_status()
        job_data = response.json().get("job")
        return VerificationJob.model_validate(job_data) if job_data else None

    async def download_evidence(self, job_id: str) -> bytes:
        response = await self._client.get(f"/internal/ai/verification-jobs/{job_id}/evidence")
        if response.status_code == 404:
            raise NoEvidenceFileError(job_id)
        response.raise_for_status()
        return response.content

    async def complete_job(self, job_id: str, payload: CompleteJobRequest) -> dict:
        response = await self._client.post(
            f"/internal/ai/verification-jobs/{job_id}/complete",
            json=payload.model_dump(mode="json", exclude_none=True),
        )
        response.raise_for_status()
        return response.json()

    async def fail_job(self, job_id: str, error_message: str) -> dict:
        response = await self._client.post(
            f"/internal/ai/verification-jobs/{job_id}/fail",
            json={"errorMessage": error_message},
        )
        response.raise_for_status()
        return response.json()

    async def aclose(self) -> None:
        await self._client.aclose()
