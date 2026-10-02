import type { OtpType, PolicyType } from '@prisma/client';

export const AUTH_ERRORS = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EXISTS: 'USER_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_RESEND_COOLDOWN: 'OTP_RESEND_COOLDOWN',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
  ACCOUNT_DELETE_FAILED: 'ACCOUNT_DELETE_FAILED',
} as const;

export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET: 'auth.password.reset',
  OTP_VERIFIED: 'auth.otp.verified',
  ACCOUNT_DELETED: 'auth.account.deleted',
  PROFILE_UPDATED: 'auth.profile.updated',
  LOGIN_FAILED: 'auth.login.failed',
  /** A sign-in finished on a device the account had not used before. Triggers the security alert email. */
  NEW_DEVICE_LOGIN: 'auth.login.new_device',
  PHONE_CHANGED: 'auth.phone.changed',
  POLICIES_ACCEPTED: 'auth.policies.accepted',
} as const;

export const ACCOUNT_LOCK = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_DURATION_MINUTES: 30,
} as const;

// Blocklist, not an allowlist: PENDING_VERIFICATION must stay usable everywhere this
// is checked, since email/phone verification is optional at signup and only required
// before withdrawals — an unverified user is otherwise a normal, logged-in user.
export const BLOCKED_ACCOUNT_STATUSES = ['SUSPENDED', 'BANNED', 'DEACTIVATED'] as const;

export const PASSWORD_POLICY = {
  /** Spec (security chapter): at least 10 characters. Only applies when a password is set; existing ones still work. */
  MIN_LENGTH: 10,
  MAX_LENGTH: 72,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  /** A new password may not match any of this many most recent ones, the current one included (spec: last 5). */
  HISTORY_DEPTH: 5,
} as const;

/** Upper, lower, digit and special character, within the length limits above. Shared by every DTO that sets a password. */
export const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{${PASSWORD_POLICY.MIN_LENGTH},${PASSWORD_POLICY.MAX_LENGTH}}$`,
);
export const PASSWORD_PATTERN_MESSAGE = 'Password must contain uppercase, lowercase, number, and special character';

/**
 * The legal documents a person accepts (spec FR-008), where the apps read their text (a published CMS page with this
 * slug), and the version currently in force.
 *
 * Why the version lives in code and not on the CMS page: a typo fix on the page must not make every user accept again,
 * while a real change of terms must. Bump a version here, in a deploy, when the text changes materially; everyone is
 * asked to accept the new version the next time they open an app.
 */
export const POLICY_DOCUMENTS = [
  { policy: 'TERMS_OF_SERVICE', slug: 'terms-and-conditions', title: 'Terms & Conditions', version: '2026-10-01' },
  { policy: 'PRIVACY_POLICY', slug: 'privacy-policy', title: 'Privacy Policy', version: '2026-10-01' },
  { policy: 'REWARD_POLICY', slug: 'reward-policy', title: 'Reward Policy', version: '2026-10-01' },
] as const satisfies ReadonlyArray<{ policy: PolicyType; slug: string; title: string; version: string }>;

/**
 * The OTP types the general send/verify/resend endpoints accept. NEW_DEVICE_LOGIN and PHONE_CHANGE are left out on
 * purpose: each has its own endpoint that checks extra things (the pending sign-in, the new number). Through the
 * general endpoints, a PHONE_CHANGE code would go to the old phone and email, and skip proving the new number.
 */
export const GENERIC_OTP_TYPES = [
  'REGISTRATION',
  'PASSWORD_RESET',
  'TWO_FACTOR',
  'EMAIL_VERIFICATION',
  'PHONE_VERIFICATION',
] as const satisfies ReadonlyArray<OtpType>;
export type GenericOtpType = (typeof GENERIC_OTP_TYPES)[number];

/** How long a new-device sign-in may wait for its code before the person has to sign in again. */
export const LOGIN_CHALLENGE_TTL_SECONDS = 10 * 60;

/** How long a requested phone number change stays open for its code. */
export const PHONE_CHANGE_TTL_SECONDS = 10 * 60;

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60,
  RESET_TOKEN_EXPIRY: 60,
} as const;

/**
 * What a person can say they are. The database enum also has ALL, which only makes sense when a campaign says
 * who it is for, never for a person.
 */
export const USER_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type UserGender = (typeof USER_GENDERS)[number];

/** Matches the youngest age a campaign may target. */
export const MIN_USER_AGE = 13;
export const MAX_USER_AGE = 120;
