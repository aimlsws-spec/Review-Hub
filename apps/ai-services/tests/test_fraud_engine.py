import io

from PIL import Image

from src.core.models import Submission, SubmissionTask
from src.engines.fraud_engine import score_fraud


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


def _png_bytes(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color="white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_clean_submission_scores_zero():
    assert score_fraud(_submission(textAnswer="Great product, loved the packaging!"), ocr_text="thanks!") == 0.0


def test_junk_text_answer_is_penalized():
    assert score_fraud(_submission(textAnswer="asdf"), ocr_text=None) >= 0.4


def test_short_text_answer_is_penalized():
    assert score_fraud(_submission(textAnswer="ok"), ocr_text=None) >= 0.3


def test_keyboard_mash_text_is_penalized_as_junk():
    assert score_fraud(_submission(textAnswer="hahahahaha"), ocr_text=None) >= 0.4


def test_repeated_attempts_increase_score():
    low = score_fraud(_submission(attemptNumber=1), ocr_text=None)
    high = score_fraud(_submission(attemptNumber=5), ocr_text=None)
    assert high > low


def test_blank_ocr_text_on_file_submission_is_suspicious():
    score = score_fraud(_submission(fileUrl="submissions/proof.png"), ocr_text="   ")
    assert score >= 0.25


def test_score_never_exceeds_one():
    score = score_fraud(
        _submission(attemptNumber=10, textAnswer="asdf", fileUrl="submissions/proof.png"),
        ocr_text="",
        evidence_bytes=_png_bytes(10, 10),
    )
    assert score <= 1.0


def test_url_matching_the_task_platform_is_not_penalized():
    submission = _submission(externalUrl="https://www.instagram.com/p/xyz", task=SubmissionTask(taskType="INSTAGRAM_LIKE"))
    assert score_fraud(submission, ocr_text=None) == 0.0


def test_url_from_the_wrong_platform_is_penalized():
    submission = _submission(externalUrl="https://example.com/not-instagram", task=SubmissionTask(taskType="INSTAGRAM_LIKE"))
    assert score_fraud(submission, ocr_text=None) >= 0.4


def test_url_check_is_skipped_for_task_types_with_no_fixed_platform():
    submission = _submission(externalUrl="https://example.com/anything", task=SubmissionTask(taskType="WEBSITE_VISIT"))
    assert score_fraud(submission, ocr_text=None) == 0.0


def test_url_check_is_skipped_when_task_context_is_missing():
    submission = _submission(externalUrl="https://example.com/anything")
    assert score_fraud(submission, ocr_text=None) == 0.0


def test_tiny_evidence_image_is_penalized():
    submission = _submission(fileUrl="submissions/proof.png")
    score = score_fraud(submission, ocr_text="some text", evidence_bytes=_png_bytes(10, 10))
    assert score >= 0.3


def test_normal_sized_evidence_image_is_not_penalized_for_size():
    submission = _submission(fileUrl="submissions/proof.png")
    score = score_fraud(submission, ocr_text="some text", evidence_bytes=_png_bytes(400, 800))
    assert score == 0.0


def test_non_image_evidence_bytes_do_not_crash_the_size_check():
    submission = _submission(fileUrl="submissions/proof.mp4")
    score = score_fraud(submission, ocr_text="some text", evidence_bytes=b"not-an-image-at-all")
    assert score == 0.0
