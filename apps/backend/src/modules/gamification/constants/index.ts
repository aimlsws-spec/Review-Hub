/** level = floor(sqrt(xp / XP_PER_LEVEL_FACTOR)) + 1 — a simple curve where each level needs progressively more XP, no separate thresholds table to maintain. */
export const GAMIFICATION_CONSTANTS = {
  XP_PER_LEVEL_FACTOR: 100,
  /** XP awarded per credited reward = the reward amount in whole rupees, 1:1. */
  XP_PER_RUPEE: 1,
} as const;

export const GAMIFICATION_EVENTS = {
  LEVEL_UP: 'gamification.level_up',
  BADGE_EARNED: 'gamification.badge_earned',
  DAILY_REWARD_CLAIMED: 'gamification.daily_reward_claimed',
} as const;
