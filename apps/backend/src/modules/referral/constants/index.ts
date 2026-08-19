/**
 * Flat one-time bonus paid to the referrer when the person they referred
 * gets their first task reward credited. The PDF's tiered percentage-of-
 * earnings model isn't implemented here — that needs its own design pass
 * once real earnings volume exists to tune the tiers against.
 */
export const REFERRAL_CONSTANTS = {
  SIGNUP_BONUS_AMOUNT: 50,
} as const;

export const REFERRAL_EVENTS = {
  ATTRIBUTED: 'referral.attributed',
  REWARDED: 'referral.rewarded',
} as const;
