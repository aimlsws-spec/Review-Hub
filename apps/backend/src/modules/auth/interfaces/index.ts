import { DevicePlatform, SessionStatus, UserStatus } from '@prisma/client';

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

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  referralCode?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
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
  referralCode: string;
  timezone: string | null;
  language: string | null;
  createdAt: Date;
}
