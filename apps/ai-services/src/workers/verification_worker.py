"""Polls the backend for queued verification jobs and processes them one at
a time, matching the atomic-claim contract in
AiVerificationJobRepository.claimNextQueued (only one worker can ever win a
given job, so running multiple instances of this worker is safe).
"""
import asyncio

from ..core.config import Settings
from ..core.exceptions import NoEvidenceFileError
from ..core.logging import get_logger
from ..core.models import CompleteJobRequest
from ..engines import VerificationEngine
from ..services import BackendClient

logger = get_logger(__name__)


class VerificationWorker:
    def __init__(self, settings: Settings, backend_client: BackendClient, engine: VerificationEngine):
        self._settings = settings
        self._client = backend_client
        self._engine = engine
        self._running = False

    async def run_forever(self) -> None:
        self._running = True
        logger.info(
            "Verification worker started (engine=%s, model=%s, poll=%.1fs)",
            self._settings.engine_name,
            self._settings.engine_model,
            self._settings.poll_interval_seconds,
        )
        while self._running:
            try:
                await self._poll_once()
            except Exception:
                logger.exception("Unexpected error in verification worker loop")
            await asyncio.sleep(self._settings.poll_interval_seconds)

    def stop(self) -> None:
        self._running = False

    async def _poll_once(self) -> None:
        job = await self._client.claim_next_job()
        if job is None:
            return

        logger.info("Claimed verification job %s (submission=%s)", job.id, job.submissionId)
        try:
            evidence_bytes = None
            if job.submission.fileUrl:
                try:
                    evidence_bytes = await self._client.download_evidence(job.id)
                except NoEvidenceFileError:
                    logger.warning("Evidence file missing on disk for job %s", job.id)

            outcome = await self._engine.verify(job.submission, evidence_bytes)
            await self._client.complete_job(
                job.id,
                CompleteJobRequest(
                    decision=outcome.decision,
                    confidence=outcome.confidence,
                    fraudScore=outcome.fraud_score,
                    explanation=outcome.explanation,
                    rawResponse=outcome.raw,
                    engine=self._settings.engine_name,
                    model=self._settings.engine_model,
                ),
            )
            logger.info(
                "Completed job %s -> %s (confidence=%.2f, fraud=%.2f)",
                job.id,
                outcome.decision.value,
                outcome.confidence,
                outcome.fraud_score,
            )
        except Exception as exc:
            logger.exception("Verification failed for job %s", job.id)
            try:
                await self._client.fail_job(job.id, str(exc)[:500])
            except Exception:
                logger.exception("Failed to report failure back to the backend for job %s", job.id)
