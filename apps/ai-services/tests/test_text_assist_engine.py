import pytest

from src.core.models import AssistRequest
from src.engines.text_assist_engine import TextAssistEngine, build_template_suggestion


class _FakeOllama:
    def __init__(self, available: bool = False, response: str | None = None):
        self.available = available
        self._response = response

    async def ask(self, _prompt: str):
        return self._response


def _request(**overrides) -> AssistRequest:
    base = dict(
        taskType="GOOGLE_REVIEW",
        campaignTitle="Summer Launch",
        campaignDescription="A great new product. It ships fast.",
        taskTitle="Write a Google review",
    )
    base.update(overrides)
    return AssistRequest(**base)


def test_template_suggestion_uses_campaign_title_and_description():
    suggestion = build_template_suggestion(_request())
    assert "Summer Launch" in suggestion
    assert "A great new product" in suggestion


def test_template_falls_back_to_generic_highlight_with_no_description():
    suggestion = build_template_suggestion(_request(campaignDescription=None))
    assert "great quality and easy to use" in suggestion


def test_unknown_task_type_falls_back_to_text_template():
    suggestion = build_template_suggestion(_request(taskType="SOME_NEW_TYPE"))
    assert suggestion.startswith("Summer Launch —")


@pytest.mark.asyncio
async def test_uses_template_when_llm_unavailable():
    engine = TextAssistEngine(_FakeOllama(available=False))

    result = await engine.suggest(_request())

    assert result.source == "template"
    assert "Summer Launch" in result.suggestion


@pytest.mark.asyncio
async def test_uses_llm_response_when_available():
    engine = TextAssistEngine(_FakeOllama(available=True, response="Loved this product, works great!"))

    result = await engine.suggest(_request())

    assert result.source == "llm"
    assert result.suggestion == "Loved this product, works great!"


@pytest.mark.asyncio
async def test_falls_back_to_template_when_llm_returns_nothing():
    engine = TextAssistEngine(_FakeOllama(available=True, response=None))

    result = await engine.suggest(_request())

    assert result.source == "template"
