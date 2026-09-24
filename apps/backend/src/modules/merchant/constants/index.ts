export const MERCHANT_ERRORS = {
  NOT_FOUND: 'MERCHANT_NOT_FOUND',
  ALREADY_EXISTS: 'MERCHANT_ALREADY_EXISTS',
  DUPLICATE_GST: 'DUPLICATE_GST',
  DUPLICATE_PAN: 'DUPLICATE_PAN',
  NOT_VERIFIED: 'MERCHANT_NOT_VERIFIED',
  KYC_ALREADY_SUBMITTED: 'KYC_ALREADY_SUBMITTED',
  KYC_NOT_FOUND: 'KYC_NOT_FOUND',
  KYC_ALREADY_VERIFIED: 'KYC_ALREADY_VERIFIED',
  TEAM_MEMBER_EXISTS: 'TEAM_MEMBER_EXISTS',
  TEAM_MEMBER_NOT_FOUND: 'TEAM_MEMBER_NOT_FOUND',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  BANK_NOT_FOUND: 'BANK_NOT_FOUND',
  BANK_LIMIT_REACHED: 'BANK_LIMIT_REACHED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  CANNOT_REMOVE_OWNER: 'CANNOT_REMOVE_OWNER',
  DUPLICATE_ACCOUNT: 'DUPLICATE_ACCOUNT',
  REFUND_NOT_FOUND: 'REFUND_NOT_FOUND',
  REFUND_NOT_REVIEWABLE: 'REFUND_NOT_REVIEWABLE',
  AUTO_RECHARGE_THRESHOLD_NOT_BELOW_AMOUNT: 'AUTO_RECHARGE_THRESHOLD_NOT_BELOW_AMOUNT',
} as const;

export const MERCHANT_TEAM_ROLES_KEY = 'merchantTeamRoles';

export const MERCHANT_EVENTS = {
  REGISTERED: 'merchant.registered',
  UPDATED: 'merchant.updated',
  APPROVED: 'merchant.approved',
  REJECTED: 'merchant.rejected',
  KYC_UPLOADED: 'merchant.kyc.uploaded',
  BANK_ADDED: 'merchant.bank.added',
  TEAM_INVITED: 'merchant.team.invited',
  TEAM_MEMBER_UPDATED: 'merchant.team.member_updated',
  TEAM_MEMBER_REMOVED: 'merchant.team.member_removed',
  REFUND_REQUESTED: 'merchant.refund.requested',
  REFUND_APPROVED: 'merchant.refund.approved',
  REFUND_REJECTED: 'merchant.refund.rejected',
  AUTO_RECHARGE_TRIGGERED: 'merchant.wallet.auto_recharge_triggered',
  AUTO_RECHARGE_PAYMENT_DUE: 'merchant.wallet.auto_recharge_payment_due',
} as const;

/** Refund statuses a reviewer can still act on. */
export const REVIEWABLE_REFUND_STATUSES = ['PENDING', 'UNDER_REVIEW'];

export const DOCUMENT_STORAGE = {
  BASE_PATH: 'merchant',
  DOCUMENTS_PATH: 'merchant/documents',
  LOGOS_PATH: 'merchant/logos',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;

/**
 * Limits on money an admin credits to a merchant wallet after a bank transfer. A cap is a safety net against a
 * mistyped amount, not a business rule: a merchant paying more sends it in more than one transfer.
 */
export const MANUAL_TOP_UP = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1_000_000,
  /** The transfer must have reached the bank within this many days, so an old reference can not be reused as cover. */
  MAX_AGE_DAYS: 180,
  REFERENCE_TYPE: 'ManualTopUp',
  REVERSAL_REFERENCE_TYPE: 'ManualTopUpReversal',
  /** Used when no platform configuration has been saved: a top-up above this waits for a second admin. */
  DEFAULT_APPROVAL_THRESHOLD: 100_000,
} as const;

export const MERCHANT_CONSTANTS = {
  MAX_BANK_ACCOUNTS: 5,
  MAX_TEAM_MEMBERS: 20,
  INVITATION_EXPIRY_HOURS: 48,
} as const;

/**
 * Wallet auto-recharge: the merchant sets a minimum balance threshold and a top-up amount; a
 * scheduled sweep (AutoRechargeSchedulerService) tops the wallet up once availableBalance drops
 * to or below the threshold.
 */
export const MERCHANT_WALLET_CONSTANTS = {
  MIN_AUTO_RECHARGE_THRESHOLD: 1,
  MIN_AUTO_RECHARGE_AMOUNT: 100,
  /**
   * A wallet already recharged within this window is skipped by the sweep even if it's still at
   * or below threshold — the recharge just triggered may not have credited yet (real Razorpay:
   * awaiting the merchant completing checkout), and re-triggering every sweep would spam a
   * pending order/notification rather than waiting for the first one to resolve.
   */
  RECHARGE_COOLDOWN_MINUTES: 60,
} as const;

export const AUTO_RECHARGE_CRON_PATTERN = '*/15 * * * *';
export const AUTO_RECHARGE_JOB_NAME = 'sweep';
export const AUTO_RECHARGE_REPEAT_JOB_ID = 'wallet-auto-recharge-sweep';
