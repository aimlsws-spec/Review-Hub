"""Social caption generator. Reuses the same LLM plumbing as the review
assistant (see review_assistant_engine.py) but has none of its compliance
constraints — a promotional caption isn't a review, so nothing here needs to
be grounded in a specific user's own experience.

Output format: JSON — see review_assistant_engine.py's module docstring for
why a custom line format was dropped in favor of this after live testing.
"""
import json
import re
from typing import Optional

from ..core.models import CaptionRequest, CaptionResponse, CaptionStyle

_STYLES = ["short", "long", "professional", "festival", "emoji"]

_TEMPLATE_BY_STYLE = {
    "short": "{title} — don't miss it!",
    "long": "{title}. {description} Check it out and see for yourself.",
    "professional": "Introducing {title}. {description}",
    "festival": "🎉 {title} is here — celebrate with us! {description}",
    "emoji": "✨ {title} ✨ {description} 🔥",
}

_JSON_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


def _description_or_default(description: Optional[str]) -> str:
    return (description or "").strip().split(".")[0][:120] or "Something you don't want to miss."


def _hashtag_slug(title: str) -> str:
    return "".join(ch for ch in title if ch.isalnum())


def build_template_captions(request: CaptionRequest) -> list[CaptionStyle]:
    description = _description_or_default(request.campaignDescription)
    return [
        CaptionStyle(
            style=style,
            caption=_TEMPLATE_BY_STYLE[style].format(title=request.campaignTitle, description=description),
        )
        for style in _STYLES
    ]


def build_template_hashtags(request: CaptionRequest) -> list[str]:
    slug = _hashtag_slug(request.campaignTitle)
    return [f"#{slug}", "#ViralKar"] if slug else ["#ViralKar"]


def _parse_json_captions(text: str) -> tuple[list[CaptionStyle], list[str]]:
    match = _JSON_OBJECT.search(text)
    if not match:
        return [], []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return [], []
    if not isinstance(data, dict):
        return [], []

    captions: list[CaptionStyle] = []
    for style in _STYLES:
        value = data.get(style)
        if isinstance(value, str) and value.strip():
            captions.append(CaptionStyle(style=style, caption=value.strip()))

    hashtags_raw = data.get("hashtags")
    hashtags = (
        [tag.strip() for tag in hashtags_raw if isinstance(tag, str) and tag.strip().startswith("#")]
        if isinstance(hashtags_raw, list)
        else []
    )
    return captions, hashtags


class CaptionEngine:
    def __init__(self, ollama_service):
        self._ollama = ollama_service

    async def generate(self, request: CaptionRequest) -> CaptionResponse:
        template_captions = build_template_captions(request)
        template_hashtags = build_template_hashtags(request)

        if not self._ollama.available:
            return CaptionResponse(captions=template_captions, hashtags=template_hashtags, source="template")

        prompt = (
            f'Write 5 social media captions for a campaign called "{request.campaignTitle}". '
            f"Details: {(request.campaignDescription or '')[:300]}. "
            "One caption per style: short, long, professional, festival, emoji. "
            "Also include 3 to 5 relevant hashtags.\n\n"
            "Respond with ONLY a valid JSON object, nothing else — no markdown, no code fences, no "
            'explanation, no leading text, in exactly this shape: {"short": "...", "long": "...", '
            '"professional": "...", "festival": "...", "emoji": "...", "hashtags": ["#tag1", "#tag2"]}'
        )
        raw = await self._ollama.ask(prompt)
        if not raw:
            return CaptionResponse(captions=template_captions, hashtags=template_hashtags, source="template")

        parsed_captions, parsed_hashtags = _parse_json_captions(raw)
        if not parsed_captions:
            return CaptionResponse(captions=template_captions, hashtags=template_hashtags, source="template")
        return CaptionResponse(
            captions=parsed_captions,
            hashtags=parsed_hashtags or template_hashtags,
            source="llm",
        )
