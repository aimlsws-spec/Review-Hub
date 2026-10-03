/** How the ledger entries for service charges are referenced (WalletTransaction.referenceType). */
export const SERVICE_CHARGE_REFERENCE_TYPE = 'MerchantServiceCharge';

/** Days a renewal may stay unpaid (PAST_DUE) before the subscription expires. Retried daily meanwhile. */
export const SUBSCRIPTION_GRACE_DAYS = 3;

export const SUBSCRIPTION_EVENTS = {
  /** A renewal could not be paid; the merchant is told to top up. */
  RENEWAL_FAILED: 'subscription.renewal_failed',
  EXPIRED: 'subscription.expired',
} as const;
