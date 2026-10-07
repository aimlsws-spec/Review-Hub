import { DevicePlatform, PolicyType, SessionStatus, UserStatus } from '@prisma/client';

import type { UserGender } from '../constants';

export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  role?: string[];
  permissions?: string[];
  deviceId?: string;
  sessionId?: string;
  jti?: string;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

/** A refresh token that is still usable, and what the rotated session must keep from the old one. */
export interface RefreshTokenValidation {
  userId: string;
  sessionId: string;
  deviceId?: string;
  rememberMe: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    isTwoFactorEnabled: boolean;
  };
  tokens: AuthTokens;
}

/**
 * What a password sign-in returns instead of tokens when it comes from a device the account has not used before. The
 * client asks for the code that was sent, then calls POST /auth/login/verify-device with it and this token.
 */
export interface LoginChallengeResponse {
  requiresVerification: true;
  /** Why a code is needed: the account has two-factor sign-in on, or the device is new to it. */
  reason: 'TWO_FACTOR' | 'NEW_DEVICE';
  challengeToken: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Masked email and/or phone the code went to, e.g. ["j****n@example.com", "****3210"]. */
  sentTo: string[];
}

/** What a person can tell us about themselves. `null` clears a saved value; leaving a field out keeps it. */
export interface DemographicsInput {
  /** YYYY-MM-DD */
  dateOfBirth?: string | null;
  gender?: UserGender | null;
  stateId?: string | null;
  cityId?: string | null;
}

export interface UpdateProfileInput extends DemographicsInput {
  firstName?: string;
  lastName?: string;
  /** Empty string removes the number. */
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface RegisterInput extends DemographicsInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  /** Must be true: the person accepts the policy documents currently in force (FR-008). */
  acceptPolicies: boolean;
  referralCode?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
  isAutomationDetected?: boolean;
}

export interface SocialLoginInput {
  provider: 'google' | 'apple';
  providerId: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  xForwardedFor?: string;
  via?: string;
  /** Raw X-Device-ID header; hashed before it is stored. */
  installId?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
  isAutomationDetected?: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string | null;
  deviceName: string | null;
  devicePlatform: DevicePlatform | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date | null;
}

export interface OtpResponse {
  message: string;
  expiresIn: number;
  retryAfter?: number;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  isTwoFactorEnabled: boolean;
  /** False for an account that only ever signed in with Google/Apple: there is no password to confirm actions with. */
  hasPassword: boolean;
  referralCode: string;
  timezone: string | null;
  language: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  gender: UserGender | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  /** Legal documents whose current version this person still has to accept. The apps ask before anything else. */
  pendingPolicies: PolicyType[];
  /** Role names as the token carries them, e.g. ['ADMIN', 'FINANCE_TEAM']. */
  roles: string[];
  createdAt: Date;
}
