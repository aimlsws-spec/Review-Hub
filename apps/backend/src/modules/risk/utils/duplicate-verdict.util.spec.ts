import { isRiskier, judgeDuplicate, wordSimilarity } from './duplicate-verdict.util';

const followScreen = 'you are following viralkar official on instagram today';

// A busier screen (20 distinct words), like a real screenshot, so a word or two of difference is a small share.
const busyScreen =
  'profile followers following posts message notifications explore reels shop home search settings activity saved archive insights promotions contacts messages stories';
const withWordsChanged = (text: string, count: number) =>
  text
    .split(' ')
    .map((word, index) => (index < count ? `${word}x` : word))
    .join(' ');

describe('wordSimilarity', () => {
  it('is 1 for the same words, whatever the order', () => {
    expect(wordSimilarity('followed the brand today', 'today followed the brand')).toBe(1);
  });

  it('is 0 when nothing is shared', () => {
    expect(wordSimilarity('alpha bravo charlie', 'delta echo foxtrot')).toBe(0);
  });

  it('is the share of words in common', () => {
    // 3 shared of 5 distinct words overall
    expect(wordSimilarity('alpha bravo charlie delta', 'alpha bravo charlie echo')).toBeCloseTo(3 / 5);
  });

  it('ignores very short words, which are mostly OCR noise', () => {
    expect(wordSimilarity('of to it is', 'of to it is')).toBe(0);
    expect(wordSimilarity('a b followed brand', 'x y followed brand')).toBe(1);
  });

  it('is 0 when either side has nothing to compare', () => {
    expect(wordSimilarity('', 'followed brand')).toBe(0);
    expect(wordSimilarity('followed brand', '   ')).toBe(0);
  });
});

describe('judgeDuplicate', () => {
  describe('a picture the same user sent before', () => {
    it('is only a low note, whatever the text says, because it never justifies holding a reward', () => {
      for (const [mine, theirs] of [[null, null], ['', ''], [followScreen, followScreen], [followScreen, 'something else entirely']]) {
        expect(judgeDuplicate({ sameUser: true, mineText: mine, theirText: theirs })?.riskLevel).toBe('LOW');
      }
    });
  });

  describe("another user's picture", () => {
    const judge = (mineText: string | null, theirText: string | null) => judgeDuplicate({ sameUser: false, mineText, theirText });

    it('is serious when two photos (no readable text) match: that is the same photo sent twice', () => {
      expect(judge('', '')?.riskLevel).toBe('HIGH');
    });

    it('is serious when two screenshots match and say the same thing', () => {
      const verdict = judge(followScreen, followScreen);
      expect(verdict?.riskLevel).toBe('HIGH');
      expect(verdict?.reason).toMatch(/matching text/);
    });

    it('tolerates OCR reading a recompressed copy slightly differently (one word out of twenty)', () => {
      expect(judge(busyScreen, withWordsChanged(busyScreen, 1))?.riskLevel).toBe('HIGH');
    });

    it('keeps two honest screenshots of the same screen, with a couple of words different, at MEDIUM so nobody is held for it', () => {
      // Same screen, different username and count: 2 of 20 words differ, which is also what OCR noise looks like.
      const verdict = judge(busyScreen, withWordsChanged(busyScreen, 2));
      expect(verdict?.riskLevel).toBe('MEDIUM');
      expect(verdict?.reason).toMatch(/partly matching/);
    });

    it('is NOT a duplicate when the screens look alike but the words are different (two honest users, two usernames)', () => {
      const mine = 'priya sharma is following viralkar official with 204 followers and 12 posts';
      const theirs = 'arjun mehta requested to follow brandname studio with 9800 followers and 431 posts';
      expect(judge(mine, theirs)).toBeNull();
    });

    it('is only a medium note when the text partly matches', () => {
      const mine = 'alpha bravo charlie delta echo foxtrot golf hotel';
      const theirs = 'alpha bravo charlie delta echo foxtrot india juliet';
      expect(judge(mine, theirs)?.riskLevel).toBe('MEDIUM');
    });

    it('is only a medium note when the text could not be compared, which never holds a reward by itself', () => {
      expect(judge(null, followScreen)?.riskLevel).toBe('MEDIUM');
      expect(judge(followScreen, null)?.riskLevel).toBe('MEDIUM');
      expect(judge(null, null)?.riskLevel).toBe('MEDIUM');
      expect(judge(null, '')?.riskLevel).toBe('MEDIUM');
    });

    it('is only a medium note when one picture has text and the other has none', () => {
      expect(judge('', followScreen)?.riskLevel).toBe('MEDIUM');
      expect(judge(followScreen, '')?.riskLevel).toBe('MEDIUM');
    });

    it('always explains itself in the reason', () => {
      for (const [mine, theirs] of [['', ''], [null, null], [followScreen, followScreen]] as const) {
        expect(judge(mine, theirs)?.reason).toMatch(/different user/);
      }
    });
  });
});

describe('isRiskier', () => {
  it('orders LOW < MEDIUM < HIGH < CRITICAL', () => {
    expect(isRiskier('HIGH', 'MEDIUM')).toBe(true);
    expect(isRiskier('CRITICAL', 'HIGH')).toBe(true);
    expect(isRiskier('MEDIUM', 'LOW')).toBe(true);
    expect(isRiskier('LOW', 'MEDIUM')).toBe(false);
    expect(isRiskier('HIGH', 'HIGH')).toBe(false);
  });
});
