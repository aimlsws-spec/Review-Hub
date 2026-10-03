import { GAMIFICATION_CONSTANTS } from './constants';

/**
 * Named tiers over the numeric level, lowest first. The level comes from XP (see levelForXp); a tier is only a name
 * for a range of levels, so changing a threshold here re-tiers everyone at once and needs no data change.
 * Thresholds as agreed with the product owner on 3 Oct 2026. Platinum (level 30) needs 84,100 XP, so it stays rare.
 */
export const TIERS = [
  { tier: 'BRONZE', minLevel: 1 },
  { tier: 'SILVER', minLevel: 5 },
  { tier: 'GOLD', minLevel: 10 },
  { tier: 'DIAMOND', minLevel: 20 },
  { tier: 'PLATINUM', minLevel: 30 },
] as const;

export type Tier = (typeof TIERS)[number]['tier'];

export interface TierProgress {
  tier: Tier;
  /** Null at the top tier. */
  nextTier: Tier | null;
  /** Level at which the next tier starts, or null at the top tier. */
  nextTierLevel: number | null;
  /** XP still needed to reach the next tier, or null at the top tier. */
  xpToNextTier: number | null;
  /** 0–100: how far through the current tier's XP range the person is. 100 at the top tier. */
  progressPercent: number;
}

/** The least XP that reaches a level, inverting level = floor(sqrt(xp / factor)) + 1. */
export function xpForLevel(level: number): number {
  return GAMIFICATION_CONSTANTS.XP_PER_LEVEL_FACTOR * Math.max(0, level - 1) ** 2;
}

export function tierForLevel(level: number): Tier {
  let current: Tier = TIERS[0].tier;
  for (const entry of TIERS) if (level >= entry.minLevel) current = entry.tier;
  return current;
}

export function tierProgress(level: number, xp: number): TierProgress {
  const index = TIERS.findIndex((entry) => entry.tier === tierForLevel(level));
  const next = TIERS[index + 1];
  if (!next) return { tier: TIERS[index].tier, nextTier: null, nextTierLevel: null, xpToNextTier: null, progressPercent: 100 };

  const from = xpForLevel(TIERS[index].minLevel);
  const to = xpForLevel(next.minLevel);
  const progress = Math.min(100, Math.max(0, Math.floor(((xp - from) / (to - from)) * 100)));
  return {
    tier: TIERS[index].tier,
    nextTier: next.tier,
    nextTierLevel: next.minLevel,
    xpToNextTier: Math.max(0, to - xp),
    progressPercent: progress,
  };
}
