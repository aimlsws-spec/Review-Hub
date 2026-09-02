import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OtpType } from '@prisma/client';

import { NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { AUTH_EVENTS, ACCOUNT_LOCK } from '../constants';
import type { LoginResponse, AuthTokens, RegisterInput, SocialLoginInput, UserProfile } from '../interfaces';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { UserRepository } from '../repositories/user.repository';

import { DeviceMetadata , DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly deviceService: DeviceService,
    private readonly passwordService: PasswordService,
    private readonly otpService: OtpService,
    private readonly loginHistoryRepository: LoginHistoryRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const existing = await this.userRepository.findByEmailOrPhone(input.email, input.phone);
    if (existing) throw new ConflictException('User', 'email or phone');

    const passwordHash = await this.passwordService.hash(input.password);

    let referrer: { id: string } | null = null;
    if (input.referralCode) {
      referrer = await this.userRepository.findByReferralCode(input.referralCode);
    }

    const user = await this.userRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      referredBy: referrer ? { connect: { id: referrer.id } } : undefined,
    });


    // Register device and create session
    const deviceMetadata = this.deviceService.parseUserAgent(userAgent);
    const fingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
    const deviceId = await this.deviceService.registerDevice(user.id, {
      ...deviceMetadata,
      fingerprint,
    } as DeviceMetadata);

    const { sessionId, refreshToken } = await this.sessionService.createSession(
      user.id, ipAddress, userAgent, deviceId,
    );
    const tokens = this.sessionService.generateTokens(user.id, sessionId, []);

    this.eventEmitter.emit(AUTH_EVENTS.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      referredById: user.referredById,
      referralCode: referrer ? input.referralCode : undefined,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      tokens: { ...tokens, refreshToken },
    };
  }


  async login(
    email?: string,
    phone?: string,
    password?: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe = false,
  ): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmailOrPhone(email, phone);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    this.checkAccountStatus(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    if (!user.passwordHash || !password) {

      await this.loginHistoryRepository.create({
        userId: user.id,
        ipAddress,
        userAgent,
        isSuccess: false,
        failureReason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      await this.loginHistoryRepository.create({
        userId: user.id,
        ipAddress,
        userAgent,
        isSuccess: false,
        failureReason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.resetFailedAttempts(user.id);
    await this.userRepository.updateLastLogin(user.id, ipAddress ?? '');
    await this.loginHistoryRepository.create({ userId: user.id, ipAddress, userAgent, isSuccess: true });

    // Register/update device before the session, so the session can link to it
    const deviceMetadata = this.deviceService.parseUserAgent(userAgent);
    const fingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
    const deviceId = await this.deviceService.registerDevice(user.id, {
      ...deviceMetadata,
      fingerprint,
    } as DeviceMetadata);
    const { sessionId, refreshToken } = await this.sessionService.createSession(user.id, ipAddress, userAgent, deviceId, rememberMe);
    const roles = await this.userRepository.getRoleNames(user.id);
    const tokens = this.sessionService.generateTokens(user.id, sessionId, roles);

    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_IN, { userId: user.id, ipAddress });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      tokens: { ...tokens, refreshToken },
    };
  }

  /**
   * Google/Apple sign-in. Links to an existing account by verified email when one
   * exists (so a user who registered by password can also sign in socially later),
   * otherwise provisions a new, already-verified account — the provider has already
   * done the identity verification we'd normally do via OTP.
   */
  async socialLogin(input: SocialLoginInput): Promise<LoginResponse> {
    const { provider, providerId, email, firstName, lastName, avatarUrl, ipAddress, userAgent } = input;

    let user =
      provider === 'google'
        ? await this.userRepository.findByGoogleId(providerId)
        : await this.userRepository.findByAppleId(providerId);

    if (!user) {
      const existingByEmail = email ? await this.userRepository.findByEmail(email) : null;
      const providerIdField = provider === 'google' ? { googleId: providerId } : { appleId: providerId };

      if (existingByEmail) {
        user = await this.userRepository.update(existingByEmail.id, {
          ...providerIdField,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        });
      } else {
        user = await this.userRepository.create({
          firstName,
          lastName,
          email,
          avatarUrl,
          status: 'ACTIVE',
          emailVerifiedAt: email ? new Date() : undefined,
          ...providerIdField,
        });

        this.eventEmitter.emit(AUTH_EVENTS.USER_REGISTERED, {
          userId: user.id,
          email: user.email,
          phone: user.phone,
        });
      }
    }

    this.checkAccountStatus(user);
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    await this.userRepository.updateLastLogin(user.id, ipAddress ?? '');
    await this.loginHistoryRepository.create({ userId: user.id, ipAddress, userAgent, isSuccess: true });

    const deviceMetadata = this.deviceService.parseUserAgent(userAgent);
    const fingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
    const deviceId = await this.deviceService.registerDevice(user.id, {
      ...deviceMetadata,
      fingerprint,
    } as DeviceMetadata);
    const { sessionId, refreshToken } = await this.sessionService.createSession(user.id, ipAddress, userAgent, deviceId);
    const roles = await this.userRepository.getRoleNames(user.id);
    const tokens = this.sessionService.generateTokens(user.id, sessionId, roles);

    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_IN, { userId: user.id, ipAddress });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      tokens: { ...tokens, refreshToken },
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const validation = await this.sessionService.validateRefreshToken(refreshToken);
    if (!validation) throw new UnauthorizedException('Invalid or expired refresh token');

    await this.sessionService.revokeSession(validation.sessionId);
    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_OUT, { userId: validation.userId, sessionId: validation.sessionId });
  }

  /** Called by the mobile app once it has an FCM token — not always available at login time. */
  async updatePushToken(sessionId: string | undefined, pushToken: string): Promise<void> {
    if (!sessionId) return;
    const session = await this.sessionService.getSessionById(sessionId);
    if (!session?.deviceId) return;
    await this.deviceService.updatePushToken(session.deviceId, pushToken);
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionService.revokeSession(sessionId);
    } else {
      await this.sessionService.revokeAllUserSessions(userId);
    }
    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_OUT, { userId, sessionId });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId);
    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_OUT, { userId });
  }

  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const validation = await this.sessionService.validateRefreshToken(refreshToken);
    if (!validation) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.userRepository.findById(validation.userId);
    if (!user) throw new UnauthorizedException('User not found');

    this.checkAccountStatus(user);

    await this.sessionService.revokeSession(validation.sessionId);
    const { sessionId: newSessionId, refreshToken: newRefreshToken } = await this.sessionService.createSession(user.id, ipAddress, userAgent);
    const roles = await this.userRepository.getRoleNames(user.id);
    const tokens = this.sessionService.generateTokens(user.id, newSessionId, roles);

    return { ...tokens, refreshToken: newRefreshToken };
  }

  async forgotPassword(email?: string, phone?: string): Promise<void> {
    const user = await this.userRepository.findByEmailOrPhone(email, phone);
    if (!user) return;

    await this.otpService.sendOtp(user.id, OtpType.PASSWORD_RESET);
  }

  async resetPassword(email: string | undefined, phone: string | undefined, code: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmailOrPhone(email, phone);
    if (!user) throw new BadRequestException('Unable to reset password. Invalid request.');

    const verified = await this.otpService.verifyOtp(user.id, OtpType.PASSWORD_RESET, code);
    if (!verified) throw new BadRequestException('Unable to reset password. Invalid code.');

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(user.id, { passwordHash });

    await this.sessionService.revokeAllUserSessions(user.id);
    this.eventEmitter.emit(AUTH_EVENTS.PASSWORD_RESET, { userId: user.id });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      referralCode: user.referralCode,
      timezone: user.timezone,
      language: user.language,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; timezone?: string; language?: string }): Promise<UserProfile> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    await this.userRepository.update(userId, data);
    this.eventEmitter.emit(AUTH_EVENTS.PROFILE_UPDATED, { userId, changes: data as Record<string, unknown> });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');
    if (!user.passwordHash) throw new BadRequestException('Password not set. Use OTP login.');

    const isValid = await this.passwordService.verify(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const isSame = await this.passwordService.verify(newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('New password must be different from current password');

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(userId, { passwordHash });

    await this.sessionService.revokeAllUserSessions(userId);
    this.eventEmitter.emit(AUTH_EVENTS.PASSWORD_CHANGED, { userId });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    await this.sessionService.revokeAllUserSessions(userId);
    await this.userRepository.softDelete(userId);

    this.eventEmitter.emit(AUTH_EVENTS.ACCOUNT_DELETED, { userId });
  }

  async sendOtp(userId: string, type: OtpType) {
    return this.otpService.sendOtp(userId, type);
  }

  async verifyOtp(userId: string, type: OtpType, code: string) {
    return this.otpService.verifyOtp(userId, type, code);
  }

  async resendOtp(userId: string, type: OtpType) {
    return this.otpService.resendOtp(userId, type);
  }

  async enableTwoFactor(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');
    if (user.isTwoFactorEnabled) throw new BadRequestException('Two-factor authentication is already enabled');

    const verified = await this.otpService.verifyOtp(userId, OtpType.TWO_FACTOR, code);
    if (!verified) throw new BadRequestException('Invalid verification code');

    await this.userRepository.update(userId, { isTwoFactorEnabled: true });
    this.logger.log(`2FA enabled for user ${userId}`);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');
    if (!user.isTwoFactorEnabled) throw new BadRequestException('Two-factor authentication is not enabled');

    const verified = await this.otpService.verifyOtp(userId, OtpType.TWO_FACTOR, code);
    if (!verified) throw new BadRequestException('Invalid verification code');

    await this.userRepository.update(userId, { isTwoFactorEnabled: false });
    this.logger.log(`2FA disabled for user ${userId}`);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verifyTwoFactor(userId: string, code: string): Promise<{ message: string }> {
    const verified = await this.otpService.verifyOtp(userId, OtpType.TWO_FACTOR, code);
    if (!verified) throw new BadRequestException('Invalid verification code');

    return { message: 'Two-factor authentication verified successfully' };
  }

  async getActiveSessions(userId: string) {
    return this.sessionService.getActiveSessions(userId);
  }

  async getUserPermissions(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User');

    const permissions = new Set<string>();
    for (const userRole of user.userRoles) {
      for (const rp of userRole.role.rolePermissions) {
        permissions.add(`${rp.permission.module}:${rp.permission.action}`);
      }
    }
    return Array.from(permissions);
  }

  async getUserRoles(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User');

    return user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      slug: ur.role.slug,
    }));
  }

  private checkAccountStatus(user: { status: string; lockedUntil: Date | null }): void {
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account is suspended');
    if (user.status === 'BANNED') throw new UnauthorizedException('Account is banned');
    if (user.status === 'DEACTIVATED') throw new UnauthorizedException('Account is deactivated');
  }

  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    await this.userRepository.incrementFailedAttempts(userId);
    this.eventEmitter.emit(AUTH_EVENTS.LOGIN_FAILED, { userId });

    const newAttempts = currentAttempts + 1;
    if (newAttempts >= ACCOUNT_LOCK.MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + ACCOUNT_LOCK.LOCK_DURATION_MINUTES * 60 * 1000);
      await this.userRepository.lockAccount(userId, lockUntil);
    }
  }
}
