"""Combines OCR text extraction and fraud heuristics into a verification
verdict for a task submission.

Confidence and fraud score are compared against the same thresholds the
backend enforces (Settings.min_confidence / max_fraud_score, mirroring
AI_VERIFICATION_THRESHOLDS) so this service's own decision agrees with the
backend's final gate in the common case — the backend re-checks
independently regardless, so this is an optimization, not a trust boundary.
"""
from dataclasses import dataclass
from typing import Any, Optional

from ..core.config import Settings
from ..core.models import Submission, VerificationDecision
from .fraud_engine import score_fraud
from .image_fingerprint import dhash, normalize_evidence_text


@dataclass
class VerificationOutcome:
    decision: VerificationDecision
    confidence: float
    fraud_score: float
    explanation: str
    raw: dict[str, Any]
    # Perceptual fingerprint of the evidence image, and its normalised OCR text, so the backend can spot the
    # same picture submitted again. None when the evidence is not an image or could not be read.
    perceptual_hash: Optional[str] = None
    evidence_text: Optional[str] = None


class VerificationEngine:
    def __init__(self, settings: Settings, ocr_service, ollama_service):
        self._settings = settings
        self._ocr = ocr_service
        self._ollama = ollama_service

    async def verify(self, submission: Submission, evidence_bytes: Optional[bytes]) -> VerificationOutcome:
        ocr_text: Optional[str] = None
        if evidence_bytes and self._ocr.available:
            ocr_text = self._ocr.extract_text(evidence_bytes)

        fraud_score = score_fraud(submission, ocr_text, evidence_bytes)
        confidence = self._score_confidence(submission, evidence_bytes, ocr_text, fraud_score)
        decision = self._decide(confidence, fraud_score)
        explanation = await self._build_explanation(decision, confidence, fraud_score, ocr_text)

        perceptual_hash = dhash(evidence_bytes) if evidence_bytes else None

        return VerificationOutcome(
            decision=decision,
            confidence=round(confidence, 3),
            fraud_score=round(fraud_score, 3),
            explanation=explanation,
            raw={
                "ocrTextPreview": (ocr_text or "")[:500],
                "ocrAvailable": self._ocr.available,
                "llmAvailable": self._ollama.available,
            },
            perceptual_hash=perceptual_hash,
            # Only meaningful next to an image fingerprint; without one there is nothing to compare.
            evidence_text=normalize_evidence_text(ocr_text) if perceptual_hash else None,
        )

    def _score_confidence(
        self,
        submission: Submission,
        evidence_bytes: Optional[bytes],
        ocr_text: Optional[str],
        fraud_score: float,
    ) -> float:
        has_evidence = bool(evidence_bytes) or bool(submission.externalUrl) or bool(submission.textAnswer)
        if not has_evidence:
            return 0.2
        if submission.fileUrl and evidence_bytes is None:
            return 0.3  # Evidence file was expected but couldn't be fetched.
        if submission.fileUrl and self._ocr.available and ocr_text is not None and not ocr_text.strip():
            return 0.4  # Image present but OCR found no readable text — suspicious.

        base = 0.75 + (0.15 if ocr_text else 0.0)
        return max(0.0, min(base - fraud_score * 0.3, 0.99))

    def _decide(self, confidence: float, fraud_score: float) -> VerificationDecision:
        if fraud_score >= 0.85:
            return VerificationDecision.REJECT
        if confidence >= self._settings.min_confidence and fraud_score <= self._settings.max_fraud_score:
            return VerificationDecision.APPROVE
        return VerificationDecision.MANUAL_REVIEW

    async def _build_explanation(
        self,
        decision: VerificationDecision,
        confidence: float,
        fraud_score: float,
        ocr_text: Optional[str],
    ) -> str:
        fallback = f"Heuristic verification: decision={decision.value}, confidence={confidence:.2f}, fraudScore={fraud_score:.2f}."
        if not self._ollama.available:
            return fallback

        prompt = (
            "You are reviewing a marketing task submission for a reward platform. "
            f"Decision: {decision.value}. Confidence: {confidence:.2f}. Fraud score: {fraud_score:.2f}. "
            f"Extracted evidence text: {(ocr_text or '(none)')[:1000]}. "
            "In one short sentence, explain this verification result to a human reviewer."
        )
        return await self._ollama.ask(prompt) or fallback
