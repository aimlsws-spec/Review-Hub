import { ReviewAspect, ReviewExperience } from '../dto/draft-review.dto';

/**
 * Plain review drafts written without the AI service, used when it is unreachable. They follow the same rules as
 * the AI service's own templates (apps/ai-services/src/engines/review_assistant_engine.py) and have to stay in step
 * with them: the tone comes from the person's own answers, never from a default of praise, and a recommendation is
 * only ever added when the person gave one.
 */
export interface ReviewDraftAnswers {
  businessName: string;
  likedAspects?: ReviewAspect[] | string[];
  improveAspects?: ReviewAspect[] | string[];
  experience?: ReviewExperience;
  wouldRecommend?: boolean;
  notes?: string;
}

const ASPECT_LABELS: Record<string, string> = {
  FOOD: 'the food',
  STAFF: 'the staff',
  PRICE: 'the price',
  CLEANLINESS: 'cleanliness',
  SERVICE: 'the service',
};

const OVERALL = 'the overall experience';
const SOME_PARTS = 'some parts of the visit';
const A_FEW_THINGS = 'a few things';

const TEMPLATES: Record<ReviewExperience, string[]> = {
  POSITIVE: [
    'Visited {business} recently and liked {liked}.',
    '{business} stood out for {liked}.',
    'Had a good experience at {business}, especially {liked}.',
    'My visit to {business} went well. {Liked} was good.',
  ],
  MIXED: [
    '{business} had some good points: {liked}. But {improve} could be better.',
    'A mixed experience at {business}. I liked {liked}, but {improve} could be better.',
    'At {business}, {liked} was good while {improve} left room for improvement.',
    'Some things went well at {business} ({liked}) and some did not ({improve}).',
  ],
  NEGATIVE: [
    'My visit to {business} was disappointing, mainly because of {improve}.',
    '{Improve} at {business} did not meet my expectations.',
    'I had a poor experience at {business}. {Improve} needs work.',
    'Not a good visit to {business}: {improve} fell short.',
  ],
};

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function phrase(aspects: string[] | undefined, fallback: string): string {
  const labels = (aspects ?? []).map((a) => ASPECT_LABELS[a.toUpperCase()] ?? a.toLowerCase());
  if (labels.length === 0) return fallback;
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** The person's own answer when they gave one; otherwise it follows what they filled in. Never defaults to praise. */
export function resolveExperience(answers: ReviewDraftAnswers): ReviewExperience {
  if (answers.experience) return answers.experience;
  const liked = (answers.likedAspects ?? []).length > 0;
  const improve = (answers.improveAspects ?? []).length > 0;
  if (liked && improve) return 'MIXED';
  if (improve) return 'NEGATIVE';
  return 'POSITIVE';
}

export function buildReviewDraftTemplates(answers: ReviewDraftAnswers): string[] {
  const experience = resolveExperience(answers);
  const liked = phrase(answers.likedAspects, experience === 'MIXED' ? SOME_PARTS : OVERALL);
  const improve = phrase(answers.improveAspects, experience === 'MIXED' ? A_FEW_THINGS : OVERALL);

  let drafts = TEMPLATES[experience].map((template) =>
    template
      .replace(/\{business\}/g, answers.businessName)
      .replace(/\{liked\}/g, liked)
      .replace(/\{Liked\}/g, capitalise(liked))
      .replace(/\{improve\}/g, improve)
      .replace(/\{Improve\}/g, capitalise(improve)),
  );

  if (answers.wouldRecommend !== undefined) {
    const suffix = answers.wouldRecommend ? 'I would recommend it.' : 'I would not recommend it.';
    drafts = drafts.map((draft) => `${draft} ${suffix}`);
  }
  const note = answers.notes?.trim();
  return note ? drafts.map((draft) => `${draft} ${note}`) : drafts;
}
