import { DevicePlatform, SessionStatus, UserStatus } from '@prisma/client';

export class UserEntity {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string | null;
  phone!: string | null;
  passwordHash!: string | null;
  avatarUrl!: string | null;
  status!: UserStatus;
  emailVerifiedAt!: Date | null;
  phoneVerifiedAt!: Date | null;
  lastLoginAt!: Date | null;
  lastLoginIp!: string | null;
  timezone!: string | null;
  language!: string | null;
  referralCode!: string;
  referredById!: string | null;
  isTwoFactorEnabled!: boolean;
  failedLoginAttempts!: number;
  lockedUntil!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}

export class SessionEntity {
  id!: string;
  userId!: string;
  refreshTokenHash!: string;
  ipAddress!: string | null;
  deviceId!: string | null;
  userAgent!: string | null;
  status!: SessionStatus;
  expiresAt!: Date;
  revokedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class DeviceEntity {
  id!: string;
  userId!: string;
  name!: string | null;
  platform!: DevicePlatform;
  os!: string | null;
  appVersion!: string | null;
  fingerprint!: string | null;
  isActive!: boolean;
  lastSeenAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
