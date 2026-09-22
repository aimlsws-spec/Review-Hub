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


# --- The assistant is balanced: tone follows the person's own answers, and it never speaks for them -------------


class _Capture(_FakeOllama):
    """A model that records the prompt it was given."""

    def __init__(self, response: str):
        super().__init__(available=True, response=response)
        self.prompt = ""

    async def ask(self, prompt: str):
        self.prompt = prompt
        return self._response


_FOUR = '["A.", "B.", "C.", "D."]'


def test_the_word_recommend_never_appears_unless_the_person_said_so():
    for aspects in (
        dict(likedAspects=["FOOD"]),
        dict(likedAspects=["FOOD"], improveAspects=["SERVICE"]),
        dict(improveAspects=["SERVICE"]),
        dict(),
    ):
        for draft in build_template_drafts(_request(**aspects), count=4):
            assert "recommend" not in draft.lower()


def test_a_recommendation_is_added_only_when_the_person_gave_one():
    yes = build_template_drafts(_request(wouldRecommend=True))
    no = build_template_drafts(_request(wouldRecommend=False))

    assert all(d.endswith("I would recommend it.") for d in yes)
    assert all(d.endswith("I would not recommend it.") for d in no)


def test_someone_who_listed_only_problems_gets_negative_drafts_not_praise():
    drafts = build_template_drafts(_request(likedAspects=[], improveAspects=["SERVICE"]))

    assert all("the service" in d.lower() for d in drafts)
    assert not any(word in " ".join(drafts).lower() for word in ("loved", "really liked", "good experience", "stood out"))


def test_someone_who_listed_both_gets_mixed_drafts_naming_both():
    drafts = build_template_drafts(_request(likedAspects=["FOOD"], improveAspects=["PRICE"]))

    assert all("the food" in d and "the price" in d for d in drafts)
    assert any("could be better" in d or "room for improvement" in d for d in drafts)


def test_the_persons_own_overall_answer_wins_over_what_they_listed():
    negative = build_template_drafts(_request(likedAspects=["FOOD"], experience="NEGATIVE"))
    positive = build_template_drafts(_request(likedAspects=["FOOD"], improveAspects=["PRICE"], experience="POSITIVE"))

    assert any("disappointing" in d or "poor" in d or "not a good" in d.lower() for d in negative)
    assert any("liked" in d or "good" in d for d in positive)


def test_a_mixed_visit_with_nothing_listed_still_reads_naturally():
    drafts = build_template_drafts(_request(likedAspects=[], improveAspects=[], experience="MIXED"))

    assert len(drafts) == 4
    assert all("Cafe Aroma" in d for d in drafts)
    assert any("some parts of the visit" in d for d in drafts)
    assert any("a few things" in d for d in drafts)


def test_notes_come_after_the_recommendation():
    drafts = build_template_drafts(_request(wouldRecommend=True, notes="Parking was hard."))

    assert all(d.endswith("I would recommend it. Parking was hard.") for d in drafts)


def test_older_requests_with_only_liked_aspects_still_work():
    drafts = build_template_drafts(ReviewDraftRequest(businessName="Cafe Aroma", likedAspects=["FOOD"]))

    assert len(drafts) == 4
    assert all("the food" in d.lower() for d in drafts)


@pytest.mark.asyncio
async def test_the_prompt_carries_the_persons_answers_and_no_praise_of_its_own():
    llm = _Capture(_FOUR)
    engine = ReviewAssistantEngine(llm)

    await engine.draft(_request(likedAspects=["FOOD"], improveAspects=["PRICE"], experience="MIXED"))

    assert "mixed" in llm.prompt
    assert "They liked: the food" in llm.prompt
    assert "could be better: the price" in llm.prompt
    assert "did not say whether they would recommend" in llm.prompt
    assert "Never mention a star rating" in llm.prompt


@pytest.mark.asyncio
async def test_the_prompt_says_when_the_person_would_not_recommend():
    llm = _Capture(_FOUR)

    await ReviewAssistantEngine(llm).draft(_request(wouldRecommend=False))

    assert "would NOT recommend" in llm.prompt


@pytest.mark.asyncio
async def test_a_model_draft_that_mentions_stars_is_dropped():
    response = '["Great food, easily 5 stars.", "Loved the food.", "Food was really good.", "The food impressed me."]'

    result = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request())

    assert result.source == "llm"
    assert result.drafts == ["Loved the food.", "Food was really good.", "The food impressed me."]


@pytest.mark.asyncio
async def test_a_model_draft_that_recommends_uninvited_is_dropped():
    response = '["Would definitely recommend it!", "Loved the food.", "Food was good.", "Nice service too."]'

    result = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request())

    assert all("recommend" not in d.lower() for d in result.drafts)
    assert len(result.drafts) == 3


@pytest.mark.asyncio
async def test_a_recommendation_that_contradicts_the_persons_answer_is_dropped():
    response = '["I would not recommend it.", "I would recommend it.", "Food was good.", "Nice service."]'

    said_yes = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request(wouldRecommend=True))
    said_no = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request(wouldRecommend=False))

    assert "I would not recommend it." not in said_yes.drafts
    assert "I would recommend it." in said_yes.drafts
    assert "I would recommend it." not in said_no.drafts
    assert "I would not recommend it." in said_no.drafts


@pytest.mark.asyncio
async def test_falls_back_to_templates_when_the_model_leaves_too_few_acceptable_drafts():
    response = '["5 stars!", "Rated it 10/10", "Would recommend", "Loved the food."]'

    result = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request())

    assert result.source == "template"
    assert len(result.drafts) == 4
    assert all("recommend" not in d.lower() for d in result.drafts)


@pytest.mark.asyncio
async def test_a_very_long_model_draft_is_dropped():
    long_draft = " ".join(["word"] * 80)
    response = f'["{long_draft}", "Loved the food.", "Food was good.", "Nice service."]'

    result = await ReviewAssistantEngine(_FakeOllama(available=True, response=response)).draft(_request())

    assert long_draft not in result.drafts
