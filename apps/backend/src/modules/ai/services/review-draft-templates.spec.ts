import { buildReviewDraftTemplates, resolveExperience } from './review-draft-templates';

/**
 * These mirror apps/ai-services/tests/test_review_assistant_engine.py: the two sets of templates have to behave the
 * same way, because the backend uses these whenever the AI service can not be reached.
 */
describe('review draft templates', () => {
  const base = { businessName: 'Cafe Aroma' };

  describe('resolveExperience', () => {
    it.each([
      ['only good points', { likedAspects: ['FOOD'] }, 'POSITIVE'],
      ['nothing at all', {}, 'POSITIVE'],
      ['both good points and problems', { likedAspects: ['FOOD'], improveAspects: ['PRICE'] }, 'MIXED'],
      ['only problems', { improveAspects: ['PRICE'] }, 'NEGATIVE'],
    ])('follows what was listed: %s', (_label, answers, expected) => {
      expect(resolveExperience({ ...base, ...answers })).toBe(expected);
    });

    it("takes the person's own answer over what they listed", () => {
      expect(resolveExperience({ ...base, likedAspects: ['FOOD'], experience: 'NEGATIVE' })).toBe('NEGATIVE');
    });
  });

  it('never says "recommend" unless the person said whether they would', () => {
    for (const answers of [{ likedAspects: ['FOOD'] }, { likedAspects: ['FOOD'], improveAspects: ['PRICE'] }, { improveAspects: ['PRICE'] }, {}]) {
      for (const draft of buildReviewDraftTemplates({ ...base, ...answers })) {
        expect(draft.toLowerCase()).not.toContain('recommend');
      }
    }
  });

  it("adds a recommendation only when one was given, in the person's own direction", () => {
    expect(buildReviewDraftTemplates({ ...base, wouldRecommend: true }).every((d) => d.endsWith('I would recommend it.'))).toBe(true);
    expect(buildReviewDraftTemplates({ ...base, wouldRecommend: false }).every((d) => d.endsWith('I would not recommend it.'))).toBe(true);
  });

  it('writes negative drafts, without praise, for someone who only listed problems', () => {
    const drafts = buildReviewDraftTemplates({ ...base, improveAspects: ['SERVICE'] });

    expect(drafts.every((d) => d.toLowerCase().includes('the service'))).toBe(true);
    expect(drafts.join(' ').toLowerCase()).not.toMatch(/loved|really liked|good experience|stood out/);
  });

  it('names both sides in a mixed review', () => {
    const drafts = buildReviewDraftTemplates({ ...base, likedAspects: ['FOOD'], improveAspects: ['PRICE'] });

    expect(drafts.every((d) => d.includes('the food') && d.includes('the price'))).toBe(true);
  });

  it('reads naturally when a mixed visit has nothing listed', () => {
    const drafts = buildReviewDraftTemplates({ ...base, experience: 'MIXED' });

    expect(drafts.join(' ')).toContain('some parts of the visit');
    expect(drafts.join(' ')).toContain('a few things');
  });

  it('joins several aspects and puts the note last', () => {
    const [first] = buildReviewDraftTemplates({ ...base, likedAspects: ['FOOD', 'STAFF', 'PRICE'], wouldRecommend: true, notes: ' Parking was hard. ' });

    expect(first).toContain('the food, the staff and the price');
    expect(first.endsWith('I would recommend it. Parking was hard.')).toBe(true);
  });
});
