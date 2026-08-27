import pytest

from src.core.config import Settings
from src.core.models import Submission, VerificationDecision
from src.engines.verification_engine import VerificationEngine


class _FakeOcr:
    def __init__(self, available: bool = False, text: str | None = None):
        self.available = available
        self._text = text

    def extract_text(self, _image_bytes: bytes):
        return self._text


class _FakeOllama:
    available = False

    async def ask(self, _prompt: str):
        return None


def _submission(**overrides) -> Submission:
    base = dict(
        id="sub-1",
        participantId="participant-1",
        taskId="task-1",
        userId="user-1",
        status="PENDING",
        verificationSource="AI",
        attemptNumber=1,
    )
    base.update(overrides)
    return Submission(**base)


@pytest.mark.asyncio
async def test_defers_a_clean_text_only_submission_for_lack_of_media_evidence():
    # Text-only evidence caps confidence at 0.75 (base, no OCR boost), below
    # the 0.85 auto-approve threshold — text answers alone aren't considered
    # strong enough evidence to auto-approve, only to avoid auto-rejection.
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(_submission(textAnswer="Really enjoyed using this, would recommend!"), evidence_bytes=None)

    assert outcome.decision == VerificationDecision.MANUAL_REVIEW
    assert outcome.fraud_score == 0.0


@pytest.mark.asyncio
async def test_defers_a_submission_with_no_evidence_at_all():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(_submission(), evidence_bytes=None)

    assert outcome.decision == VerificationDecision.MANUAL_REVIEW
    assert outcome.confidence < Settings().min_confidence


@pytest.mark.asyncio
async def test_rejects_obviously_junk_repeated_submissions():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(
        _submission(textAnswer="asdf", attemptNumber=6, fileUrl="submissions/proof.png"),
        evidence_bytes=b"fake-bytes",
    )

    assert outcome.decision == VerificationDecision.REJECT


@pytest.mark.asyncio
async def test_defers_when_evidence_file_expected_but_missing():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(_submission(fileUrl="submissions/proof.png"), evidence_bytes=None)

    assert outcome.decision == VerificationDecision.MANUAL_REVIEW


@pytest.mark.asyncio
async def test_ocr_text_boosts_confidence_when_available():
    ocr = _FakeOcr(available=True, text="I bought this and love it")
    engine = VerificationEngine(Settings(), ocr, _FakeOllama())

    outcome = await engine.verify(_submission(fileUrl="submissions/proof.png"), evidence_bytes=b"fake-bytes")

    assert outcome.decision == VerificationDecision.APPROVE
    assert "ocrAvailable" in outcome.raw and outcome.raw["ocrAvailable"] is True


@pytest.mark.asyncio
async def test_falls_back_to_heuristic_explanation_when_llm_unavailable():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(_submission(textAnswer="Loved it!"), evidence_bytes=None)

    assert "Heuristic verification" in outcome.explanation
