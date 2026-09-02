import pytest

from src.core.models import ReviewDraftRequest
from src.engines.review_assistant_engine import ReviewAssistantEngine, build_template_drafts


class _FakeOllama:
    def __init__(self, available: bool = False, response: str | None = None):
        self.available = available
        self._response = response

    async def ask(self, _prompt: str):
        return self._response


def _request(**overrides) -> ReviewDraftRequest:
    base = dict(businessName="Cafe Aroma", likedAspects=["FOOD", "SERVICE"])
    base.update(overrides)
    return ReviewDraftRequest(**base)


def test_template_drafts_mention_business_and_liked_aspects():
    drafts = build_template_drafts(_request())
    assert all("Cafe Aroma" in d for d in drafts)
    assert any("the food" in d and "the service" in d for d in drafts)


def test_template_drafts_fall_back_to_generic_phrase_with_no_aspects():
    drafts = build_template_drafts(_request(likedAspects=[]))
    assert any("the overall experience" in d for d in drafts)


def test_template_drafts_append_notes_when_given():
    drafts = build_template_drafts(_request(notes="Will definitely be back."))
    assert all(d.endswith("Will definitely be back.") for d in drafts)


def test_template_drafts_respects_requested_count():
    drafts = build_template_drafts(_request(), count=2)
    assert len(drafts) == 2


@pytest.mark.asyncio
async def test_uses_templates_when_llm_unavailable():
    engine = ReviewAssistantEngine(_FakeOllama(available=False))

    result = await engine.draft(_request())

    assert result.source == "template"
    assert len(result.drafts) == 4


@pytest.mark.asyncio
async def test_parses_a_clean_json_array():
    llm_response = (
        '["Loved the food and the quick service at Cafe Aroma.", '
        '"Cafe Aroma has great food and attentive staff.", '
        '"Really enjoyed my meal and how fast the service was.", '
        '"Solid food quality, service was quick too."]'
    )
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request())

    assert result.source == "llm"
    assert len(result.drafts) == 4
    assert result.drafts[0] == "Loved the food and the quick service at Cafe Aroma."


@pytest.mark.asyncio
async def test_parses_json_wrapped_in_a_markdown_code_fence_and_preamble():
    # Observed in live testing: small models often add a lead-in sentence
    # and/or wrap the array in a ```json code fence despite being told not to.
    llm_response = (
        "Here are the review drafts you asked for:\n\n"
        "```json\n"
        '["Loved the food and the quick service at Cafe Aroma.", '
        '"Cafe Aroma has great food and attentive staff.", '
        '"Really enjoyed my meal and how fast the service was.", '
        '"Solid food quality, service was quick too."]\n'
        "```"
    )
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request())

    assert result.source == "llm"
    assert len(result.drafts) == 4


@pytest.mark.asyncio
async def test_truncates_to_the_requested_count_if_the_model_returns_more():
    llm_response = '["one", "two", "three", "four", "five", "six"]'
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request(), count=4)

    assert len(result.drafts) == 4


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_llm_returns_nothing():
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=None))

    result = await engine.draft(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_llm_response_has_no_json_array():
    # Reproduces the actual failure mode seen live: the model ignores the
    # format instruction entirely and writes free-form <tag>-style prose.
    llm_response = "<caption>Loved the food and service here!</caption>"
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_json_is_malformed():
    llm_response = '["Loved the food", "unterminated string'
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_json_is_not_an_array():
    llm_response = '{"draft": "Loved the food"}'
    engine = ReviewAssistantEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.draft(_request())

    assert result.source == "template"
