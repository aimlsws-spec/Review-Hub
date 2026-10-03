import { tierForLevel, tierProgress, xpForLevel } from './tiers';

describe('tiers', () => {
  it.each([
    [1, 'BRONZE'],
    [4, 'BRONZE'],
    [5, 'SILVER'],
    [9, 'SILVER'],
    [10, 'GOLD'],
    [19, 'GOLD'],
    [20, 'DIAMOND'],
    [29, 'DIAMOND'],
    [30, 'PLATINUM'],
    [80, 'PLATINUM'],
  ])('level %i is %s', (level, tier) => {
    expect(tierForLevel(level)).toBe(tier);
  });

  it('knows the XP each tier starts at', () => {
    expect([1, 5, 10, 20, 30].map(xpForLevel)).toEqual([0, 1600, 8100, 36100, 84100]);
  });

  it('shows how far a person is through their tier', () => {
    expect(tierProgress(3, 800)).toEqual({
      tier: 'BRONZE',
      nextTier: 'SILVER',
      nextTierLevel: 5,
      xpToNextTier: 800,
      progressPercent: 50,
    });
  });

  it('has nothing further at the top tier', () => {
    expect(tierProgress(31, 90000)).toEqual({
      tier: 'PLATINUM',
      nextTier: null,
      nextTierLevel: null,
      xpToNextTier: null,
      progressPercent: 100,
    });
  });
});
