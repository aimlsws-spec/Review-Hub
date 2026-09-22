export const WALLET_ERRORS = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BANK_NOT_FOUND: 'BANK_NOT_FOUND',
  BANK_LIMIT_REACHED: 'BANK_LIMIT_REACHED',
  WITHDRAWAL_NOT_FOUND: 'WITHDRAWAL_NOT_FOUND',
  WITHDRAWAL_NOT_REVIEWABLE: 'WITHDRAWAL_NOT_REVIEWABLE',
  BELOW_MINIMUM_WITHDRAWAL: 'BELOW_MINIMUM_WITHDRAWAL',
  KYC_REQUIRED: 'KYC_REQUIRED',
} as const;

export const WALLET_EVENTS = {
  REWARD_CREDITED: 'wallet.reward.credited',
  WITHDRAWAL_REQUESTED: 'wallet.withdrawal.requested',
  WITHDRAWAL_APPROVED: 'wallet.withdrawal.approved',
  WITHDRAWAL_REJECTED: 'wallet.withdrawal.rejected',
} as const;

export const WALLET_CONSTANTS = {
  MIN_WITHDRAWAL_AMOUNT: 1000,
  MAX_BANK_ACCOUNTS: 3,
} as const;

/** Withdrawal statuses a reviewer can still act on. */
export const REVIEWABLE_WITHDRAWAL_STATUSES = ['PENDING', 'UNDER_REVIEW'];

/**
 * A new withdrawal is held for manual review instead of going straight to
 * PENDING when the requesting device's risk score is at or above this value.
 * DeviceService.calculateRiskScore only ever produces 0/20/40/60/80/100
 * (rooted +40, emulator +40, VPN-suspected +20, capped at 100), so 80 means
 * "rooted AND emulator" or "all three signals" — the least ambiguous
 * combinations — rather than any single weak signal alone.
 */
export const DEVICE_RISK_HOLD_THRESHOLD = 80;

/**
 * What the withdrawal rules are when the platform configuration has nothing better to say. The admin can change all of
 * these in the portal; the values there always win.
 */
export const WITHDRAWAL_DEFAULTS = {
  MINIMUM: WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT,
  MAXIMUM: 50_000,
  DAILY_LIMIT: 50_000,
  /** No monthly limit until an admin sets one. */
  MONTHLY_LIMIT: null,
  BANK_COOLING_HOURS: 24,
  PAYOUT_MODE: 'GATEWAY',
} as const;

/**
 * Withdrawals that still count against a user's daily and monthly limits. A rejected, cancelled or failed one gave
 * the money back, so it gives the limit back too.
 */
export const LIMIT_COUNTED_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID'] as const;

/** Where a withdrawal can be marked paid or failed by hand: approved, and not already with the gateway. */
export const MANUALLY_SETTLEABLE_STATUS = 'APPROVED';
