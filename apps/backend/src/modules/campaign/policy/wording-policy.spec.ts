import { blockingFindings, evaluateWording, WordingRule, WordingSeverity } from './wording-policy';

const check = (text: string) => evaluateWording([{ field: 'description', text }]);
const rulesOf = (text: string) => check(text).map((f) => f.rule);
const blocked = (text: string) => blockingFindings(check(text)).length > 0;

describe('honest-feedback wording policy', () => {
  describe('what must be blocked', () => {
    it.each([
      // asking for a rating
      ['Give us 5 stars on Google and get Rs 50', WordingRule.REQUIRES_RATING],
      ['Leave a 5-star review for our cafe', WordingRule.REQUIRES_RATING],
      ['Please rate us 5 stars', WordingRule.REQUIRES_RATING],
      ['Rate us five stars after your meal', WordingRule.REQUIRES_RATING],
      ['Post a 5 star review and earn Rs 100', WordingRule.REQUIRES_RATING],
      ['Earn a reward for every 5 star review', WordingRule.REQUIRES_RATING],
      ['We need 5 star ratings this week', WordingRule.REQUIRES_RATING],
      ['Rate us ★★★★★ on Google', WordingRule.REQUIRES_RATING],
      ['Give the highest rating possible', WordingRule.REQUIRES_RATING],
      ['Only 4 stars or above will be paid', WordingRule.REQUIRES_RATING],
      ['Rating of at least 4 required', WordingRule.REQUIRES_RATING],
      ['Minimum 4 stars', WordingRule.REQUIRES_RATING],
      ['5 star do aur paise pao', WordingRule.REQUIRES_RATING],
      ['GIVE US 5 STARS', WordingRule.REQUIRES_RATING],
      ['give us 5* please', WordingRule.REQUIRES_RATING],
      // requiring or rewarding positive
      ['Only positive reviews will be rewarded', WordingRule.REQUIRES_POSITIVE],
      ['The review must be positive', WordingRule.REQUIRES_POSITIVE],
      ['Your review should be 5 star', WordingRule.REQUIRES_POSITIVE],
      ['Write a positive review about us', WordingRule.REQUIRES_POSITIVE],
      ['Leave us a great review on Google Maps', WordingRule.REQUIRES_POSITIVE],
      ['Earn Rs 50 for a good review', WordingRule.REQUIRES_POSITIVE],
      ['Get paid for a glowing review', WordingRule.REQUIRES_POSITIVE],
      ['No negative reviews please', WordingRule.REQUIRES_POSITIVE],
      ['Negative reviews will not be accepted', WordingRule.REQUIRES_POSITIVE],
      ['Bad reviews are not eligible for the reward', WordingRule.REQUIRES_POSITIVE],
      ['Negative feedback will not be rewarded', WordingRule.REQUIRES_POSITIVE],
      ['acha review do aur inaam pao', WordingRule.REQUIRES_POSITIVE],
      ['Please do not leave any negative reviews', WordingRule.REQUIRES_POSITIVE],
      // scripted
      ['Copy and paste this review on Google', WordingRule.SCRIPTED_REVIEW],
      ['We will provide the review text for you to post', WordingRule.SCRIPTED_REVIEW],
      ['The review text is provided below', WordingRule.SCRIPTED_REVIEW],
      // no visit
      ['Post a review without visiting the store', WordingRule.NO_VISIT_NEEDED],
      ['No need to buy anything to leave a review', WordingRule.NO_VISIT_NEEDED],
      ['Write a review even if you have not visited', WordingRule.NO_VISIT_NEEDED],
      // fake / multiple
      ['Fake reviews are welcome', WordingRule.FAKE_OR_MULTIPLE],
      ['Post the review from multiple accounts for more rewards', WordingRule.FAKE_OR_MULTIPLE],
      ['Use different Google accounts to review us again', WordingRule.FAKE_OR_MULTIPLE],
    ])('%s', (text, rule) => {
      expect(rulesOf(text)).toContain(rule);
      expect(blocked(text)).toBe(true);
    });
  });

  describe('honest wording that must be left alone', () => {
    it.each([
      'Share your honest review of your visit, good or bad.',
      'Tell others about your real experience at our cafe.',
      'We welcome all feedback, positive or negative.',
      'Negative reviews are welcome and will be rewarded the same.',
      'Your honest opinion matters to us, whatever the rating.',
      'Write a review in your own words.',
      'Visit our restaurant and share what you thought.',
      'Enjoy a stay at our 5 star hotel',
      'We are a 5 star resort in Goa',
      'Experience 5 star service at every visit',
      'Our staff give guests 5 star hospitality',
      'Dinner with 5 star quality at fair prices',
      'We never accept fake reviews',
      'No fake reviews are allowed on our page',
      'We do not pay for positive reviews',
      'Reviews from a different account are not accepted',
      'The five senses come alive at our tasting room',
      'Follow our page and share a story',
      'Complete the short survey to earn Rs 20',
      'Install the app and open it once',
      'Rewards are paid for honest feedback, not for a particular rating.',
    ])('%s', (text) => {
      expect(blockingFindings(check(text))).toEqual([]);
    });
  });

  describe('softer wording that is flagged for an admin, not blocked', () => {
    it.each([
      ['Read our great reviews from happy customers', WordingRule.POSITIVE_WORDING],
      ['We would love good reviews from you', WordingRule.POSITIVE_WORDING],
      ['We hope you enjoy it and share a review of your 5 stars experience', WordingRule.STAR_MENTION],
      ['Rate your visit out of 5 stars in your review', WordingRule.STAR_MENTION],
    ])('%s', (text, rule) => {
      const findings = check(text);
      expect(findings.map((f) => f.rule)).toContain(rule);
      expect(findings.every((f) => f.severity === WordingSeverity.REVIEW)).toBe(true);
      expect(blocked(text)).toBe(false);
    });

    it('does not flag positive wording that is part of an honest request', () => {
      expect(check('Share an honest, positive or negative review')).toEqual([]);
      expect(check('Write a good or bad review, whatever you really think')).toEqual([]);
      expect(check('Leave a genuine good review only if you enjoyed it')).toEqual([]);
    });
  });

  describe('tricks that must not get past', () => {
    it.each([
      ['full-width letters', 'Ｇｉｖｅ ｕｓ ５ ｓｔａｒｓ'],
      ['invisible characters', 'Give us 5​ stars'],
      ['extra spaces and line breaks', 'Give   us\n5   stars'],
      ['soft hyphens', 'Give us 5 sta­rs'],
      ['curly quotes', 'Negative reviews won’t be accepted'],
    ])('%s', (_label, text) => {
      expect(blocked(text)).toBe(true);
    });
  });

  describe('the findings', () => {
    it('say which field, show the words found with some context, and say what to do', () => {
      const [finding] = evaluateWording([{ field: 'description', text: 'Come and enjoy our menu. Give us 5 stars on Google after your visit today.' }]);

      expect(finding).toMatchObject({ rule: WordingRule.REQUIRES_RATING, severity: WordingSeverity.BLOCK, field: 'description' });
      expect(finding.excerpt).toContain('Give us 5 stars');
      expect(finding.message).toMatch(/honest feedback, good or bad/);
    });

    it('checks every piece of text and names the field each problem is in', () => {
      const findings = evaluateWording([
        { field: 'title', text: 'Review us' },
        { field: 'description', text: 'Only positive reviews please' },
        { field: 'task: Write a review', text: 'Leave a 5 star review' },
      ]);

      expect(findings.map((f) => f.field).sort()).toEqual(['description', 'task: Write a review']);
    });

    it('lists blocking problems before flags', () => {
      const findings = evaluateWording([{ field: 'description', text: 'We love great reviews. Give us 5 stars.' }]);

      expect(findings[0].severity).toBe(WordingSeverity.BLOCK);
      expect(findings[findings.length - 1].severity).toBe(WordingSeverity.REVIEW);
    });

    it('does not report the same words twice as both a block and a flag', () => {
      const findings = check('Leave a great review');

      expect(findings.filter((f) => f.excerpt.toLowerCase().includes('great review'))).toHaveLength(1);
      expect(findings[0].severity).toBe(WordingSeverity.BLOCK);
    });

    it('does not report the same phrase twice', () => {
      const findings = check('Give us 5 stars. Give us 5 stars.');

      expect(findings.filter((f) => f.rule === WordingRule.REQUIRES_RATING)).toHaveLength(1);
    });

    it('is fine with empty or missing text', () => {
      expect(evaluateWording([{ field: 'a', text: '' }, { field: 'b', text: null }, { field: 'c' }, { field: 'd', text: '   ' }])).toEqual([]);
    });

    it('keeps the list to a reasonable length however much is wrong', () => {
      const text = Array.from({ length: 40 }, (_, i) => `Give us ${i % 2 ? 5 : 4} stars number ${i}. Only positive reviews ${i}.`).join(' ');

      expect(check(text).length).toBeLessThanOrEqual(12);
    });
  });

  it('handles long text without slowing down', () => {
    const long = 'We serve honest food and welcome honest feedback. '.repeat(2000);
    const started = Date.now();

    expect(check(long)).toEqual([]);
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
