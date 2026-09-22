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


def _photo_bytes() -> bytes:
    import io

    from PIL import Image, ImageDraw

    image = Image.new("RGB", (400, 300), "white")
    draw = ImageDraw.Draw(image)
    for i in range(0, 300, 15):
        draw.rectangle([i, i // 2, i + 60, i // 2 + 40], fill=((i * 3) % 256, (i * 7) % 256, (i * 11) % 256))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_reports_a_fingerprint_for_image_evidence_so_the_backend_can_spot_duplicates():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    outcome = await engine.verify(_submission(fileUrl="/submissions/a.png"), evidence_bytes=_photo_bytes())

    assert outcome.perceptual_hash is not None
    assert len(outcome.perceptual_hash) == 16


@pytest.mark.asyncio
async def test_the_same_picture_always_reports_the_same_fingerprint():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())
    picture = _photo_bytes()

    first = await engine.verify(_submission(fileUrl="/a.png"), evidence_bytes=picture)
    second = await engine.verify(_submission(id="sub-2", userId="user-2", fileUrl="/b.png"), evidence_bytes=picture)

    assert first.perceptual_hash == second.perceptual_hash


@pytest.mark.asyncio
async def test_reports_no_fingerprint_without_an_image():
    engine = VerificationEngine(Settings(), _FakeOcr(), _FakeOllama())

    text_only = await engine.verify(_submission(textAnswer="Really enjoyed it, would recommend!"), evidence_bytes=None)
    not_an_image = await engine.verify(_submission(fileUrl="/v.mp4"), evidence_bytes=b"\x00\x00\x00\x18ftypmp42")

    assert text_only.perceptual_hash is None
    assert text_only.evidence_text is None
    assert not_an_image.perceptual_hash is None


@pytest.mark.asyncio
async def test_says_whether_the_screenshot_had_readable_text_since_that_decides_how_a_duplicate_is_judged():
    picture = _photo_bytes()
    readable = "You are following viralkar_official on Instagram today and love it"

    with_text = await VerificationEngine(Settings(), _FakeOcr(available=True, text=readable), _FakeOllama()).verify(
        _submission(fileUrl="/a.png"), evidence_bytes=picture
    )
    no_text = await VerificationEngine(Settings(), _FakeOcr(available=True, text="  "), _FakeOllama()).verify(
        _submission(fileUrl="/a.png"), evidence_bytes=picture
    )
    ocr_off = await VerificationEngine(Settings(), _FakeOcr(available=False), _FakeOllama()).verify(
        _submission(fileUrl="/a.png"), evidence_bytes=picture
    )

    assert with_text.evidence_text == "you are following viralkar official on instagram today and love it"
    assert no_text.evidence_text == ""  # OCR ran and found nothing: most likely a photo
    assert ocr_off.evidence_text is None  # OCR did not run: we cannot tell
