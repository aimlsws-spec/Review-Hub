import { FraudRiskLevel } from '@prisma/client';

// ─── Duplicate images ──────────────────────────────────────────────────────

/**
 * Two 64-bit perceptual hashes this many bits apart or fewer count as the same picture. Recompressing,
 * resizing or lightly brightening a picture moves its hash by 0–4 bits; unrelated pictures differ by about 32.
 */
export const PERCEPTUAL_MAX_DISTANCE = 6;

/** Only recent pictures are compared: it bounds the scan, and reuse of a very old picture is rarely the same fraud. */
export const DUPLICATE_LOOKBACK_DAYS = 90;
export const DUPLICATE_MAX_MATCHES = 5;

/**
 * OCR text at least this alike means "same content"; below the lower bound it is clearly different content.
 *
 * The upper bound is deliberately strict. Two honest users' screenshots of the same app screen share almost
 * every word and differ only in a username or a count, which scores about 0.75–0.85, the same as a copied
 * screenshot that OCR read slightly differently. Holding an honest user's reward for review is a real cost,
 * so those ambiguous pairs stay at MEDIUM (recorded, but not held) and only a near-perfect text match is HIGH.
 */
export const TEXT_SAME_SIMILARITY = 0.9;
export const TEXT_DIFFERENT_SIMILARITY = 0.5;

/**
 * A flag at these levels stops a submission from being auto-approved and paid; a person looks at it first.
 * Lower levels are recorded and shown to reviewers but do not, on their own, hold a reward.
 */
export const BLOCKING_FLAG_LEVELS: FraudRiskLevel[] = ['HIGH', 'CRITICAL'];

// ─── Linked accounts ───────────────────────────────────────────────────────

/**
 * How suspicious each way of being linked to another account is. A PAN belongs to one person and a bank
 * account to one holder, so sharing either is close to proof of one person running two accounts. A shared
 * phone is common in families, and a shared IP address (a household, an office, a mobile carrier's shared
 * address) is only weak evidence.
 */
export const LINK_POINTS = {
  PAN: 60,
  BANK_ACCOUNT: 50,
  DEVICE: 25,
  IP: 8,
} as const;

/** Each kind's points stop growing at this many linked accounts, so one noisy signal cannot dominate. */
export const LINK_POINTS_CAP = { PAN: 60, BANK_ACCOUNT: 50, DEVICE: 60, IP: 16 } as const;

/** A withdrawal is held for a person to review at or above this many link points (e.g. any shared bank account or PAN). */
export const LINK_HOLD_POINTS = 50;

/** Logins this recent count when looking for accounts that share an IP address. */
export const IP_LOOKBACK_DAYS = 30;

/** An IP address used by more than this many accounts is a shared network (office, campus, carrier), not a signal. */
export const IP_MAX_SHARING_ACCOUNTS = 10;

/** How many other accounts to list per link kind, so a huge device farm cannot make one request enormous. */
export const LINKED_ACCOUNTS_LIMIT = 25;
