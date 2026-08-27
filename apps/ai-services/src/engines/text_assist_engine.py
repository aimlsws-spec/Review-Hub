"""Drafts a suggested review/caption for a task. Always returns something
usable from a free, local template; an optional local LLM (Ollama) can
refine it into more natural phrasing, but nothing here ever requires a
paid API key or leaves the machine.
"""
from typing import Optional

from ..core.models import AssistRequest, AssistResponse

_TEMPLATES = {
    "GOOGLE_REVIEW": "I recently tried {campaign}, and it was a great experience — {highlight}. Would definitely recommend it to others looking for something similar!",
    "PLAY_STORE_REVIEW": "Been using {campaign} for a while now and it's been smooth and reliable — {highlight}. Solid app overall.",
    "INSTAGRAM_STORY_SHARE": "Just tried {campaign}! {highlight} 🔥",
    "INSTAGRAM_COMMENT": "Loving {campaign} — {highlight} 👏",
    "TEXT": "{campaign} — {highlight}.",
}


def _default_highlight(campaign_description: Optional[str]) -> str:
    if campaign_description:
        return campaign_description.strip().split(".")[0][:120]
    return "great quality and easy to use"


def build_template_suggestion(request: AssistRequest) -> str:
    template = _TEMPLATES.get(request.taskType, _TEMPLATES["TEXT"])
    return template.format(campaign=request.campaignTitle, highlight=_default_highlight(request.campaignDescription))


class TextAssistEngine:
    def __init__(self, ollama_service):
        self._ollama = ollama_service

    async def suggest(self, request: AssistRequest) -> AssistResponse:
        template = build_template_suggestion(request)
        if not self._ollama.available:
            return AssistResponse(suggestion=template, source="template")

        prompt = (
            f"Write a short, natural-sounding {request.taskType.replace('_', ' ').lower()} "
            f'for a campaign called "{request.campaignTitle}". '
            f"Campaign details: {(request.campaignDescription or '')[:400]}. "
            f"Task: {request.taskTitle}. {request.taskInstructions or ''} "
            "Keep it under 40 words, written like a genuine real user, no hashtag spam."
        )
        llm_suggestion = await self._ollama.ask(prompt)
        if not llm_suggestion:
            return AssistResponse(suggestion=template, source="template")
        return AssistResponse(suggestion=llm_suggestion.strip(), source="llm")
