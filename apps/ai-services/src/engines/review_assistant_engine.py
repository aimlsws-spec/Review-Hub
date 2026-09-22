"""Guided review-drafting assistant.

This is the platform's compliance-safe alternative to paying for positive
reviews (see CLAUDE.md / the product's own BRD): a user answers a few guided
questions about their real experience, and this drafts several editable
options from *those answers* — it never invents an experience the user
didn't describe, and every draft is meant to be edited and posted by the
user themselves, never auto-submitted.

The assistant is deliberately balanced. Rewards on this platform never depend
on what a review says, so a draft must be as ready to say "this could be
better" as "this was good". Three things follow from that:

* The tone comes from the person's own answer (positive, mixed or negative),
  never from a default of praise.
* A draft only recommends the business, or says it would not, when the person
  said so. It is never added for them.
* Whatever a language model writes is checked before it is returned. Drafts
  that mention star ratings, or that recommend when nobody asked to, are
  dropped, and if too few are left the plain templates are used instead.

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

from ..core.models import ReviewDraftRequest, ReviewDraftResponse, ReviewExperience

_ASPECT_LABELS = {
    "FOOD": "the food",
    "STAFF": "the staff",
    "PRICE": "the price",
    "CLEANLINESS": "cleanliness",
    "SERVICE": "the service",
}

_OVERALL = "the overall experience"
_SOME_PARTS = "some parts of the visit"
_A_FEW_THINGS = "a few things"

# {liked} and {improve} are already phrases such as "the food and the service".
_TEMPLATES: dict[ReviewExperience, list[str]] = {
    ReviewExperience.POSITIVE: [
        "Visited {business} recently and liked {liked}.",
        "{business} stood out for {liked}.",
        "Had a good experience at {business}, especially {liked}.",
        "My visit to {business} went well. {liked_cap} was good.",
    ],
    ReviewExperience.MIXED: [
        "{business} had some good points: {liked}. But {improve} could be better.",
        "A mixed experience at {business}. I liked {liked}, but {improve} could be better.",
        "At {business}, {liked} was good while {improve} left room for improvement.",
        "Some things went well at {business} ({liked}) and some did not ({improve}).",
    ],
    ReviewExperience.NEGATIVE: [
        "My visit to {business} was disappointing, mainly because of {improve}.",
        "{improve_cap} at {business} did not meet my expectations.",
        "I had a poor experience at {business}. {improve_cap} needs work.",
        "Not a good visit to {business}: {improve} fell short.",
    ],
}

_RECOMMEND_SUFFIX = {True: "I would recommend it.", False: "I would not recommend it."}

_JSON_ARRAY = re.compile(r"\[.*\]", re.DOTALL)

# A star rating is the one thing a draft must never contain: the platform does not want a rating steered at all.
_STAR_RATING = re.compile(r"\bstars?\b|\d\s*/\s*\d|\bout of (?:5|five|10|ten)\b|\bfive[- ]star\b|\brat(?:e|ed|ing)\b", re.IGNORECASE)
_RECOMMEND = re.compile(r"\brecommend", re.IGNORECASE)
_NOT_RECOMMEND = re.compile(
    r"\b(?:not|never|n't|wouldn't|won't|can't|cannot|don't|do not|would not|will not|hardly)\s+(?:\w+\s+){0,2}?recommend|\bnot\s+recommended\b",
    re.IGNORECASE,
)
_MAX_WORDS = 60


def _labels(aspects: list[str]) -> list[str]:
    return [_ASPECT_LABELS.get(a.upper(), a.lower()) for a in aspects]


def _phrase(aspects: list[str], fallback: str) -> str:
    labels = _labels(aspects) or [fallback]
    if len(labels) == 1:
        return labels[0]
    return ", ".join(labels[:-1]) + " and " + labels[-1]


def _capitalise(text: str) -> str:
    return text[:1].upper() + text[1:]


def resolve_experience(request: ReviewDraftRequest) -> ReviewExperience:
    """The person's own answer when they gave one. Otherwise it follows what they filled in: only good points is
    positive, only problems is negative, both is mixed. It never defaults to praise for someone who listed problems."""
    if request.experience is not None:
        return request.experience
    if request.likedAspects and request.improveAspects:
        return ReviewExperience.MIXED
    if request.improveAspects:
        return ReviewExperience.NEGATIVE
    return ReviewExperience.POSITIVE


def build_template_drafts(request: ReviewDraftRequest, count: int = 4) -> list[str]:
    experience = resolve_experience(request)
    liked = _phrase(request.likedAspects, _SOME_PARTS if experience is ReviewExperience.MIXED else _OVERALL)
    improve = _phrase(request.improveAspects, _A_FEW_THINGS if experience is ReviewExperience.MIXED else _OVERALL)

    drafts = [
        template.format(
            business=request.businessName,
            liked=liked,
            liked_cap=_capitalise(liked),
            improve=improve,
            improve_cap=_capitalise(improve),
        )
        for template in _TEMPLATES[experience][:count]
    ]

    suffix = _RECOMMEND_SUFFIX.get(request.wouldRecommend) if request.wouldRecommend is not None else None
    if suffix:
        drafts = [f"{d} {suffix}" for d in drafts]
    if request.notes and request.notes.strip():
        drafts = [f"{d} {request.notes.strip()}" for d in drafts]
    return drafts


def _parse_json_drafts(text: str) -> list[str]:
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
    return [str(item).strip() for item in data if str(item).strip()]


def draft_is_acceptable(draft: str, request: ReviewDraftRequest) -> bool:
    """A model's draft is only used if it stays within what the person said."""
    if len(draft.split()) > _MAX_WORDS:
        return False
    if _STAR_RATING.search(draft):
        return False

    recommends = bool(_RECOMMEND.search(draft))
    if recommends and request.wouldRecommend is None:
        return False
    if recommends and request.wouldRecommend is True and _NOT_RECOMMEND.search(draft):
        return False
    if recommends and request.wouldRecommend is False and not _NOT_RECOMMEND.search(draft):
        return False
    return True


def _recommendation_line(request: ReviewDraftRequest) -> str:
    if request.wouldRecommend is True:
        return "The reviewer said they would recommend it, so a draft may say so."
    if request.wouldRecommend is False:
        return "The reviewer said they would NOT recommend it, so a draft may say so plainly."
    return "The reviewer did not say whether they would recommend it, so never say or hint that they would or would not."


def _build_prompt(request: ReviewDraftRequest, experience: ReviewExperience, count: int) -> str:
    facts = [f"Overall, the reviewer's experience was: {experience.value.lower()}."]
    if request.likedAspects:
        facts.append(f"They liked: {_phrase(request.likedAspects, _OVERALL)}.")
    if request.improveAspects:
        facts.append(f"They thought this could be better: {_phrase(request.improveAspects, _OVERALL)}.")
    facts.append(_recommendation_line(request))
    if request.notes and request.notes.strip():
        facts.append(f"Additional notes from the reviewer: {request.notes.strip()}.")

    return (
        f"Write {count} short, distinct, natural-sounding customer review drafts for "
        f'a business called "{request.businessName}". '
        + " ".join(facts)
        + " Each draft must be under 40 words, written like a genuine customer describing their own experience, "
        "and must reflect exactly what is listed above: do not add praise, complaints, or claims that are not "
        "listed, and do not soften or exaggerate the reviewer's opinion. Never mention a star rating or a score. "
        "No hashtags, no emojis.\n\n"
        f"Respond with ONLY a valid JSON array of exactly {count} strings, nothing else — no markdown, "
        'no code fences, no explanation, no leading text. Example: ["First draft.", "Second draft."]'
    )


class ReviewAssistantEngine:
    def __init__(self, ollama_service):
        self._ollama = ollama_service

    async def draft(self, request: ReviewDraftRequest, count: int = 4) -> ReviewDraftResponse:
        template_drafts = build_template_drafts(request, count)
        if not self._ollama.available:
            return ReviewDraftResponse(drafts=template_drafts, source="template")

        experience = resolve_experience(request)
        raw: Optional[str] = await self._ollama.ask(_build_prompt(request, experience, count))
        if not raw:
            return ReviewDraftResponse(drafts=template_drafts, source="template")

        # Anything the model wrote that steps outside what the person said is dropped, not repaired. If that
        # leaves too few to choose from, the plain templates are the honest answer.
        parsed = [d for d in _parse_json_drafts(raw) if draft_is_acceptable(d, request)][:count]
        if len(parsed) < min(count, 2):
            return ReviewDraftResponse(drafts=template_drafts, source="template")
        return ReviewDraftResponse(drafts=parsed, source="llm")
