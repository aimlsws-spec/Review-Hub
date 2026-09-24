# ADR 0001: Referral reward structure — single-level flat bonus vs. 3-tier percentage

**Status:** Proposed — recommendation below, pending sign-off from the product owner.
This is an engineering recommendation, not a binding business decision; final call rests with
whoever owns the product/revenue model.
**Date:** 2026-09-23

## Context

The original product spec (`Review Hub.txt`, §"Referral System") describes a 3-tier
percentage-of-earnings structure:

- Level 1 (your direct referral): 10% of their earnings
- Level 2 (their referral): 5%
- Level 3 (their referral's referral): 2%

What's actually built (`apps/backend/src/modules/referral`) is materially different, not just
smaller: a **flat one-time bonus** (currently ₹50, `REFERRAL_CONSTANTS.SIGNUP_BONUS_AMOUNT`) paid
to the direct referrer the first time — and only the first time — the person they referred earns
a credited reward. There is no tree beyond one level, and no ongoing revenue share.

This gap was already flagged in code (`referral/constants/index.ts`): *"The PDF's tiered
percentage-of-earnings model isn't implemented here — that needs its own design pass once real
earnings volume exists to tune the tiers against."*

## Options considered

**A. Keep single-level flat bonus (what's built today).**
- Already implemented, tested, and running through the standard wallet ledger/lock path.
- Fraud surface is small: one bonus, one trigger condition (referred user's first reward), one
  existing self-referral check (`AccountLinkageService`).
- Cannot be tuned without a code change (bonus amount is a constant, not admin-configurable).

**B. Build the full 3-tier percentage-of-earnings structure from the spec.**
- Requires: tracking a referral tree at least 3 levels deep, computing a percentage of *every*
  qualifying reward (not just the first) and crediting up to 3 ancestor referrers per transaction,
  new wallet-ledger volume proportional to total platform reward volume (not referral volume),
  and materially more fraud surface — a multi-level, percentage-of-downstream-earnings structure
  is the exact shape regulators scrutinize under India's direct-selling / money-circulation-scheme
  rules (Prize Chits and Money Circulation Schemes (Banning) Act, 1978; the 2016 Direct Selling
  Guidelines), even though this platform's underlying activity (completing tasks) is legitimate.
  That doesn't mean it's disallowed — it means it needs a compliance review before being built,
  not just an engineering estimate.

**C. Single-level, but percentage-of-earnings instead of a flat bonus, and admin-configurable.**
- A middle ground: still one level (low fraud surface, no MLM-shaped structure), but scales with
  what the referred user actually earns instead of a fixed ₹50, and the rate becomes a platform
  configuration value instead of a code constant.

## Recommendation

**Ship with Option A for launch; revisit Option C once there's real earnings volume to tune a
percentage against; treat Option B as a Phase-3 decision that needs compliance sign-off before
any engineering estimate is meaningful.**

Reasoning:
- The spec's 3-tier model was written before any usage data existed to validate that 10/5/2%
  produces sane payouts at real transaction volume — building it now means tuning blind.
- The flat-bonus model is the one that's actually tested end-to-end today; re-platforming it
  under launch pressure is the highest-risk time to do so.
- The legal-risk shape of Option B is a real, separate cost (an actual legal review, not
  engineering time) that shouldn't block the parts of launch that don't depend on it.

## What changes if this is accepted

- No code change required — this documents and ratifies the status quo.
- `REFERRAL_CONSTANTS.SIGNUP_BONUS_AMOUNT` should move from a hardcoded constant to a
  `PlatformConfiguration` field (matching how withdrawal limits and GST rate are already
  admin-configurable) so the bonus can be tuned without a deploy — tracked as a follow-up, not
  done as part of this ADR.

## What changes if this is rejected (Option B is chosen instead)

Do not start on this without:
1. A compliance/legal review of the 3-tier percentage structure against India's direct-selling
   and money-circulation-scheme rules.
2. A referral-tree schema design (current `Referral` model has no concept of depth beyond one
   level).
3. A fraud-model review — a 3-level percentage-of-earnings structure has a materially larger
   incentive to fabricate downstream accounts than a flat one-time bonus does.
