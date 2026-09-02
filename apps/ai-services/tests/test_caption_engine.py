import pytest

from src.core.models import CaptionRequest
from src.engines.caption_engine import CaptionEngine, _STYLES, build_template_captions, build_template_hashtags


class _FakeOllama:
    def __init__(self, available: bool = False, response: str | None = None):
        self.available = available
        self._response = response

    async def ask(self, _prompt: str):
        return self._response


def _request(**overrides) -> CaptionRequest:
    base = dict(campaignTitle="Summer Launch", campaignDescription="A great new product. It ships fast.")
    base.update(overrides)
    return CaptionRequest(**base)


def test_template_captions_cover_every_style():
    captions = build_template_captions(_request())
    assert [c.style for c in captions] == list(_STYLES)
    assert all("Summer Launch" in c.caption for c in captions)


def test_template_hashtags_slugify_the_title():
    hashtags = build_template_hashtags(_request(campaignTitle="Summer Launch!"))
    assert "#SummerLaunch" in hashtags


def test_template_hashtags_fall_back_when_title_has_no_alnum_chars():
    hashtags = build_template_hashtags(_request(campaignTitle="!!!"))
    assert hashtags == ["#ViralKar"]


@pytest.mark.asyncio
async def test_uses_templates_when_llm_unavailable():
    engine = CaptionEngine(_FakeOllama(available=False))

    result = await engine.generate(_request())

    assert result.source == "template"
    assert len(result.captions) == len(_STYLES)


def _json_response() -> str:
    return (
        '{"short": "Summer Launch is here!", '
        '"long": "Summer Launch just dropped, and it ships fast — check it out.", '
        '"professional": "Introducing Summer Launch, engineered for speed.", '
        '"festival": "🎉 Summer Launch is here — join the celebration!", '
        '"emoji": "✨ Summer Launch ✨ fast shipping 🔥", '
        '"hashtags": ["#SummerLaunch", "#NewDrop", "#FastShipping"]}'
    )


@pytest.mark.asyncio
async def test_parses_a_clean_json_object():
    engine = CaptionEngine(_FakeOllama(available=True, response=_json_response()))

    result = await engine.generate(_request())

    assert result.source == "llm"
    assert len(result.captions) == 5
    assert result.captions[0].style == "short"
    assert result.captions[0].caption == "Summer Launch is here!"
    assert result.hashtags == ["#SummerLaunch", "#NewDrop", "#FastShipping"]


@pytest.mark.asyncio
async def test_parses_json_wrapped_in_a_markdown_code_fence_and_preamble():
    # Observed in live testing: small models often add a lead-in sentence
    # and/or wrap the object in a ```json code fence despite being told not to.
    llm_response = f"Here are the captions you asked for:\n\n```json\n{_json_response()}\n```"
    engine = CaptionEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.generate(_request())

    assert result.source == "llm"
    assert len(result.captions) == 5


@pytest.mark.asyncio
async def test_ignores_unknown_keys_and_keeps_valid_styles():
    llm_response = '{"short": "Summer Launch is here!", "wackyStyle": "ignored"}'
    engine = CaptionEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.generate(_request())

    assert result.source == "llm"
    assert [c.style for c in result.captions] == ["short"]


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_llm_returns_nothing():
    engine = CaptionEngine(_FakeOllama(available=True, response=None))

    result = await engine.generate(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_llm_response_has_no_json_object():
    # Reproduces an actual failure mode seen live: the model ignores the
    # format instruction entirely and writes free-form labelled prose.
    llm_response = "short: Summer Launch is here!\nlong: Summer Launch just dropped."
    engine = CaptionEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.generate(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_json_is_malformed():
    llm_response = '{"short": "Summer Launch is here!", "long": unterminated'
    engine = CaptionEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.generate(_request())

    assert result.source == "template"


@pytest.mark.asyncio
async def test_falls_back_to_template_hashtags_when_llm_omits_them():
    llm_response = '{"short": "Summer Launch is here!"}'
    engine = CaptionEngine(_FakeOllama(available=True, response=llm_response))

    result = await engine.generate(_request())

    assert result.source == "llm"
    assert result.hashtags == build_template_hashtags(_request())
