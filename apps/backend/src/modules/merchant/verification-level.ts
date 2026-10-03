/**
 * Merchant verification levels from the spec, each building on the one before:
 * - L1: the owner's mobile number is verified.
 * - L2: their email is verified too.
 * - L3: the business KYC is approved by an admin.
 * - L4: Premium: on an active premium subscription plan.
 * 0 means not even the mobile number is verified. A badge only: nothing is blocked by level (decision of 3 Oct 2026).
 */
export interface VerificationFacts {
  phoneVerified: boolean;
  emailVerified: boolean;
  businessVerified: boolean;
  premium: boolean;
}

export type MerchantVerificationLevel = 0 | 1 | 2 | 3 | 4;

export function merchantVerificationLevel(facts: VerificationFacts): MerchantVerificationLevel {
  const steps = [facts.phoneVerified, facts.emailVerified, facts.businessVerified, facts.premium];
  const reached = steps.findIndex((done) => !done);
  return (reached === -1 ? 4 : reached) as MerchantVerificationLevel;
}
