"""Rule-based (not ML-based) fraud scoring — deliberately simple and free.

Every signal here is a plain heuristic over fields already on the
submission (plus, optionally, the evidence file's raw bytes); there is no
model call and nothing paid. Returns a 0-1 score where higher means more
suspicious.
"""
import io
import re
from typing import Optional
from urllib.parse import urlparse

from ..core.models import Submission

try:
    from PIL import Image

    _PILLOW_AVAILABLE = True
except ImportError:
    _PILLOW_AVAILABLE = False

_JUNK_ANSWERS = {"test", "asdf", "n/a", "na", "none", "xyz", "123"}

# A short run (1-3 chars) repeated enough to cover most of the answer, e.g.
# "aaaaaa", "hahaha", "asdasdasd" — cheap keyboard-mash / spam detector.
_REPEATED_RUN_PATTERN = re.compile(r"(.{1,3})\1{3,}", re.IGNORECASE)

# Domains a task's externalUrl should actually point at, keyed by TaskType.
# Deliberately conservative: task types with no fixed platform (URL,
# WEBSITE_VISIT, CUSTOM, SURVEY, APP_INSTALL, REFERRAL) are left unchecked.
_EXPECTED_DOMAINS: dict[str, set[str]] = {
    "INSTAGRAM_FOLLOW": {"instagram.com"},
    "INSTAGRAM_LIKE": {"instagram.com"},
    "INSTAGRAM_COMMENT": {"instagram.com"},
    "INSTAGRAM_STORY_SHARE": {"instagram.com"},
    "FACEBOOK_SHARE": {"facebook.com", "fb.com", "fb.watch"},
    "FACEBOOK_LIKE": {"facebook.com", "fb.com"},
    "GOOGLE_REVIEW": {"google.com", "g.page", "goo.gl"},
    "PLAY_STORE_REVIEW": {"play.google.com"},
    "YOUTUBE_SUBSCRIBE": {"youtube.com", "youtu.be"},
    "WATCH_VIDEO": {"youtube.com", "youtu.be"},
    "TWITTER_FOLLOW": {"twitter.com", "x.com"},
}

# An image this small is almost certainly a placeholder, a tracking pixel,
# or a corrupt/blank capture — not real proof of a completed task.
_MIN_EVIDENCE_IMAGE_PIXELS = 2_500  # e.g. 50x50


def _looks_like_junk_text(text: str) -> bool:
    normalized = text.strip().lower()
    if normalized in _JUNK_ANSWERS:
        return True
    return bool(_REPEATED_RUN_PATTERN.search(normalized))


def _domain_matches(url: str, expected: set[str]) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return False
    if host.startswith("www."):
        host = host[4:]
    return any(host == domain or host.endswith(f".{domain}") for domain in expected)


def _is_degenerate_image(evidence_bytes: bytes) -> bool:
    if not _PILLOW_AVAILABLE:
        return False
    try:
        with Image.open(io.BytesIO(evidence_bytes)) as image:
            width, height = image.size
        return width * height < _MIN_EVIDENCE_IMAGE_PIXELS
    except Exception:
        return False  # Not a (readable) image — e.g. video evidence. Not this check's job.


def score_fraud(submission: Submission, ocr_text: Optional[str], evidence_bytes: Optional[bytes] = None) -> float:
    score = 0.0

    if submission.attemptNumber > 2:
        score += 0.2 * min(submission.attemptNumber - 2, 3)

    if submission.textAnswer:
        text = submission.textAnswer.strip()
        if _looks_like_junk_text(text):
            score += 0.4
        elif len(text) < 5:
            score += 0.3

    if submission.fileUrl and ocr_text is not None and not ocr_text.strip():
        score += 0.25

    if submission.externalUrl and submission.task:
        expected = _EXPECTED_DOMAINS.get(submission.task.taskType)
        if expected and not _domain_matches(submission.externalUrl, expected):
            score += 0.4

    if evidence_bytes and _is_degenerate_image(evidence_bytes):
        score += 0.3

    return min(score, 1.0)
