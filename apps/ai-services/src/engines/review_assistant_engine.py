"""Guided review-drafting assistant.

This is the platform's compliance-safe alternative to paying for positive
reviews (see CLAUDE.md / the product's own BRD): a user answers a few guided
questions about their real experience, and this drafts several editable
options from *those answers* — it never invents an experience the user
didn't describe, and every draft is meant to be edited and posted by the
user themselves, never auto-submitted.

Output format: JSON, not a custom line format. Live testing against a small
local model (llama3.2) showed it ignoring a "number each line 1./2./3."
instruction in favor of whatever structure it felt like on a given call —
XML-ish <draft> tags, numbered headers with the draft on the next line, etc.
JSON is far more reliably followed even by small models, and parses exactly
instead of by pattern-matching prose.
"""
import json
import re
from typing import Optional

from ..core.models import ReviewDraftRequest, ReviewDraftResponse

_ASPECT_LABELS = {
    "FOOD": "the food",
    "STAFF": "the staff",
    "PRICE": "the price",
    "CLEANLINESS": "cleanliness",
    "SERVICE": "the service",
}

_TEMPLATE_OPENERS = [
    "Visited {business} recently and really liked {aspects}.",
    "{business} stood out for {aspects} — a solid experience overall.",
    "Had a good experience at {business}, especially when it came to {aspects}.",
    "Would recommend {business} — {aspects} left a good impression.",
]

_JSON_ARRAY = re.compile(r"\[.*\]", re.DOTALL)


def _aspect_phrase(liked_aspects: list[str]) -> str:
    labels = [_ASPECT_LABELS.get(a.upper(), a.lower()) for a in liked_aspects] or ["the overall experience"]
    if len(labels) == 1:
        return labels[0]
    return ", ".join(labels[:-1]) + " and " + labels[-1]


def build_template_drafts(request: ReviewDraftRequest, count: int = 4) -> list[str]:
    aspects = _aspect_phrase(request.likedAspects)
    drafts = [t.format(business=request.businessName, aspects=aspects) for t in _TEMPLATE_OPENERS[:count]]
    if request.notes:
        note = request.notes.strip()
        drafts = [f"{d} {note}" for d in drafts]
    return drafts


def _parse_json_drafts(text: str, count: int) -> list[str]:
    """The model is asked for a bare JSON array but often wraps it in a code
    fence or a lead-in sentence anyway — pull out the first [...] block."""
    match = _JSON_ARRAY.search(text)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    drafts = [str(item).strip() for item in data if str(item).strip()]
    return drafts[:count]


class ReviewAssistantEngine:
    def __init__(self, ollama_service):
        self._ollama = ollama_service

    async def draft(self, request: ReviewDraftRequest, count: int = 4) -> ReviewDraftResponse:
        template_drafts = build_template_drafts(request, count)
        if not self._ollama.available:
            return ReviewDraftResponse(drafts=template_drafts, source="template")

        aspects = _aspect_phrase(request.likedAspects)
        notes_line = f" Additional notes from the reviewer: {request.notes.strip()}." if request.notes else ""
        prompt = (
            f"Write {count} short, distinct, natural-sounding customer review drafts for "
            f'a business called "{request.businessName}". '
            f"The reviewer specifically liked: {aspects}.{notes_line} "
            "Each draft must be under 40 words, written like a genuine first-time customer describing "
            "their own experience, no hashtags, no emojis, no exaggerated or fabricated claims beyond what "
            "was described.\n\n"
            f"Respond with ONLY a valid JSON array of exactly {count} strings, nothing else — no markdown, "
            'no code fences, no explanation, no leading text. Example: ["First draft.", "Second draft."]'
        )
        raw: Optional[str] = await self._ollama.ask(prompt)
        if not raw:
            return ReviewDraftResponse(drafts=template_drafts, source="template")

        parsed = _parse_json_drafts(raw, count)
        if not parsed:
            return ReviewDraftResponse(drafts=template_drafts, source="template")
        return ReviewDraftResponse(drafts=parsed, source="llm")
