import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OtpType, User } from '@prisma/client';

import { NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from '@common/exceptions/domain.exceptions';
import { maskEmail, maskPhone } from '@common/utils';

import { LocalStorageService } from '../../../storage/storage.service';
import { IpReputationService } from '../../risk/services';
import { AUTH_EVENTS, AUTH_ERRORS, ACCOUNT_LOCK } from '../constants';
import type {
  LoginChallengeResponse,
  LoginResponse,
  AuthTokens,
  RegisterInput,
  SocialLoginInput,
  UpdateProfileInput,
  UserProfile,
} from '../interfaces';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { UserRepository } from '../repositories/user.repository';

import { DemographicsService } from './demographics.service';
import { DeviceMetadata, DeviceService, DeviceSignalsInput } from './device.service';
import { NewDeviceService, PendingLogin } from './new-device.service';
import { OtpService } from './otp.service';
import { PasswordHistoryService } from './password-history.service';
import { PasswordService } from './password.service';
import { PolicyAcceptanceService } from './policy-acceptance.service';
import { SessionService } from './session.service';

/** Everything needed to open a session for a sign-in, gathered from the request that made it. */
interface SessionContext extends Omit<PendingLogin, 'userId'> {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly deviceService: DeviceService,
    private readonly passwordService: PasswordService,
    private readonly passwordHistoryService: PasswordHistoryService,
    private readonly otpService: OtpService,
    private readonly loginHistoryRepository: LoginHistoryRepository,
    private readonly demographicsService: DemographicsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: LocalStorageService,
    private readonly ipReputation: IpReputationService,
    private readonly config: ConfigService,
    private readonly newDeviceService: NewDeviceService,
    private readonly policyAcceptanceService: PolicyAcceptanceService,
  ) {}

  /**
   * A VPN or proxy is suspected when the address is on a reputation list. The header heuristic (a Via header, or
   * several X-Forwarded-For hops) is only used when we are NOT behind a trusted proxy: behind one, several hops
   * are normal for every request and would flag everybody.
   */
  private detectVpn(ipAddress: string | undefined, signals: Pick<DeviceSignalsInput, 'xForwardedFor' | 'via'>): boolean {
    if (this.ipReputation.isAnonymizer(ipAddress)) return true;
    const behindTrustedProxy = this.config.get('risk.trustProxy', false) !== false;
    return !behindTrustedProxy && this.deviceService.detectVpnSuspicion(signals);
  }

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string, deviceSignals?: DeviceSignalsInput): Promise<LoginResponse> {
    // The DTO already insists on this; checked here too so no other caller can create an account without it.
    if (input.acceptPolicies !== true) {
      throw new BadRequestException('You must accept the Terms & Conditions, Privacy Policy and Reward Policy to create an account');
    }

    const existing = await this.userRepository.findByEmailOrPhone(input.email, input.phone);
    if (existing) throw new ConflictException('User', 'email or phone');

    // Checked before the account exists, so a bad city never leaves a half-finished sign-up behind.
    const { data: demographics } = await this.demographicsService.resolve(input);

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
      ...demographics,
    });

    // If this fails the account still exists without the record; the apps then see the documents as pending and
    // ask again, so the person is never let in without having accepted them.
    await this.policyAcceptanceService.acceptCurrent(user.id, ipAddress, userAgent);

    // Register device and create session
    const deviceMetadata = this.deviceService.parseUserAgent(userAgent);
    const fingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
    const vpnSuspected = this.detectVpn(ipAddress, deviceSignals ?? {});
    const deviceId = await this.deviceService.registerDevice(user.id, {
      ...deviceMetadata,
      fingerprint,
      isRooted: input.isRooted,
      isEmulator: input.isEmulator,
      isAutomationDetected: input.isAutomationDetected,
      vpnSuspected,
      installId: this.deviceService.hashInstallId(deviceSignals?.installId),
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

    return this.toLoginResponse(user, { ...tokens, refreshToken });
  }

  /**
   * Password sign-in. When the account has two-factor sign-in on, or the device is one the account has not used
   * before, no session is opened yet: a code goes to the account's email and phone and the caller gets a challenge
   * to complete with verifyNewDevice.
   */
  async login(
    email?: string,
    phone?: string,
    password?: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe = false,
    deviceSignals?: DeviceSignalsInput,
  ): Promise<LoginResponse | LoginChallengeResponse> {
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

    const context: SessionContext = {
      ipAddress,
      userAgent,
      rememberMe,
      isRooted: deviceSignals?.isRooted,
      isEmulator: deviceSignals?.isEmulator,
      isAutomationDetected: deviceSignals?.isAutomationDetected,
      vpnSuspected: this.detectVpn(ipAddress, deviceSignals ?? {}),
      installIdHash: this.deviceService.hashInstallId(deviceSignals?.installId) ?? null,
    };

    const isNewDevice = await this.newDeviceService.isUnrecognised(user.id, context.installIdHash ?? undefined);
    if (isNewDevice || user.isTwoFactorEnabled) {
      const challenge = await this.startLoginChallenge(user, context, isNewDevice);
      if (challenge) return challenge;
    }

    return this.completeLogin(user, context, false);
  }

  /** Finishes a sign-in held by login() for a new device or two-factor, once the person types the code that was sent. */
  async verifyNewDevice(challengeToken: string, code: string, rawInstallId: string | undefined, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const pending = await this.findPendingLogin(challengeToken, rawInstallId);

    const user = await this.userRepository.findByIdSimple(pending.userId);
    if (!user) throw new UnauthorizedException('This sign-in has expired. Please sign in again.');
    // The account may have been suspended or locked while the code was on its way.
    this.checkAccountStatus(user);
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    await this.otpService.verifyOtp(user.id, OtpType.NEW_DEVICE_LOGIN, code);
    await this.newDeviceService.consumeChallenge(challengeToken);

    return this.completeLogin(user, { ...pending, ipAddress, userAgent }, pending.isNewDevice ?? true);
  }

  /** Sends a fresh code for a sign-in that is waiting for one. The usual resend cooldown applies. */
  async resendNewDeviceCode(challengeToken: string, rawInstallId: string | undefined): Promise<{ message: string; expiresIn: number }> {
    const pending = await this.findPendingLogin(challengeToken, rawInstallId);
    return this.otpService.resendOtp(pending.userId, OtpType.NEW_DEVICE_LOGIN);
  }

  private async findPendingLogin(challengeToken: string, rawInstallId: string | undefined): Promise<PendingLogin> {
    const pending = await this.newDeviceService.findChallenge(challengeToken, this.deviceService.hashInstallId(rawInstallId));
    if (!pending) throw new UnauthorizedException('This sign-in has expired. Please sign in again.');
    return pending;
  }

  /**
   * Holds a sign-in and sends the code. For a new device only, it returns null, letting the sign-in through, when the
   * account has no email or phone to send a code to: locking such an account out would be worse than the risk, and
   * the device is still recorded so the next sign-in from it is recognised. Two-factor sign-in is never skipped: the
   * person asked for it, so without somewhere to send the code the sign-in is refused.
   */
  private async startLoginChallenge(
    user: User,
    context: SessionContext,
    isNewDevice: boolean,
  ): Promise<LoginChallengeResponse | null> {
    if (!user.email && !user.phone) {
      if (user.isTwoFactorEnabled) {
        this.logger.warn(`User ${user.id} has two-factor sign-in on but no email or phone for a code`);
        throw new UnauthorizedException(
          'Two-factor sign-in needs an email address or phone number on your account. Please contact support.',
        );
      }
      this.logger.warn(`User ${user.id} signed in from a new device but has no email or phone for a code`);
      return null;
    }

    const challengeToken = await this.newDeviceService.createChallenge({
      userId: user.id,
      rememberMe: context.rememberMe,
      installIdHash: context.installIdHash,
      isRooted: context.isRooted,
      isEmulator: context.isEmulator,
      isAutomationDetected: context.isAutomationDetected,
      vpnSuspected: context.vpnSuspected,
      isNewDevice,
    });

    let expiresIn: number;
    try {
      ({ expiresIn } = await this.otpService.sendOtp(user.id, OtpType.NEW_DEVICE_LOGIN));
    } catch (error) {
      // Signing in again within the cooldown: the code sent a moment ago is still valid, so reuse it.
      if (!(error instanceof BadRequestException) || error.code !== AUTH_ERRORS.OTP_RESEND_COOLDOWN) throw error;
      expiresIn = Number(this.config.get('OTP_EXPIRY_MINUTES', 5)) * 60;
    }

    const sentTo = [user.email && maskEmail(user.email), user.phone && maskPhone(user.phone)].filter((v): v is string => !!v);
    const reason = user.isTwoFactorEnabled ? 'TWO_FACTOR' : 'NEW_DEVICE';
    return { requiresVerification: true, reason, challengeToken, expiresIn, sentTo };
  }

  /** Opens the session for a sign-in that has passed every check, and records it. */
  private async completeLogin(user: User, context: SessionContext, isNewDevice: boolean): Promise<LoginResponse> {
    const { ipAddress, userAgent } = context;
    await this.userRepository.updateLastLogin(user.id, ipAddress ?? '');
    await this.loginHistoryRepository.create({ userId: user.id, ipAddress, userAgent, isSuccess: true });

    // Register/update device before the session, so the session can link to it
    const deviceMetadata = this.deviceService.parseUserAgent(userAgent);
    const fingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
    const deviceId = await this.deviceService.registerDevice(user.id, {
      ...deviceMetadata,
      fingerprint,
      isRooted: context.isRooted,
      isEmulator: context.isEmulator,
      isAutomationDetected: context.isAutomationDetected,
      vpnSuspected: context.vpnSuspected,
      installId: context.installIdHash ?? undefined,
    } as DeviceMetadata);
    const { sessionId, refreshToken } = await this.sessionService.createSession(user.id, ipAddress, userAgent, deviceId, context.rememberMe);
    const roles = await this.userRepository.getRoleNames(user.id);
    const tokens = this.sessionService.generateTokens(user.id, sessionId, roles);

    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_IN, { userId: user.id, ipAddress });
    if (isNewDevice) {
      this.eventEmitter.emit(AUTH_EVENTS.NEW_DEVICE_LOGIN, {
        userId: user.id,
        ipAddress,
        deviceName: deviceMetadata.name,
        os: deviceMetadata.os,
        at: new Date(),
      });
    }

    return this.toLoginResponse(user, { ...tokens, refreshToken });
  }

  private toLoginResponse(user: User, tokens: AuthTokens): LoginResponse {
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
      tokens,
    };
  }

  /**
   * Google/Apple sign-in. Links to an existing account by verified email when one
   * exists (so a user who registered by password can also sign in socially later),
   * otherwise provisions a new, already-verified account — the provider has already
   * done the identity verification we'd normally do via OTP.
   *
   * No new-device code here: the provider has just verified the person. A new device still gets the alert email.
   * A new account has not accepted the policy documents yet; the apps see them in pendingPolicies and ask first.
   */
  async socialLogin(input: SocialLoginInput): Promise<LoginResponse> {
    const { provider, providerId, email, firstName, lastName, avatarUrl, ipAddress, userAgent, xForwardedFor, via, installId } = input;

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

    const context: SessionContext = {
      ipAddress,
      userAgent,
      rememberMe: false,
      isRooted: input.isRooted,
      isEmulator: input.isEmulator,
      isAutomationDetected: input.isAutomationDetected,
      vpnSuspected: this.detectVpn(ipAddress, { xForwardedFor, via }),
      installIdHash: this.deviceService.hashInstallId(installId) ?? null,
    };
    const isNewDevice = await this.newDeviceService.isUnrecognised(user.id, context.installIdHash ?? undefined);
    return this.completeLogin(user, context, isNewDevice);
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
    // Push stops with the session: a signed-out phone must not keep showing this user's notifications.
    if (sessionId) {
      const session = await this.sessionService.getSessionById(sessionId);
      if (session?.deviceId) await this.deviceService.clearPushToken(session.deviceId);
      await this.sessionService.revokeSession(sessionId);
    } else {
      await this.deviceService.clearPushTokensForUser(userId);
      await this.sessionService.revokeAllUserSessions(userId);
    }
    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_OUT, { userId, sessionId });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.deviceService.clearPushTokensForUser(userId);
    await this.sessionService.revokeAllUserSessions(userId);
    this.eventEmitter.emit(AUTH_EVENTS.USER_LOGGED_OUT, { userId });
  }

  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const validation = await this.sessionService.validateRefreshToken(refreshToken);
    if (!validation) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.userRepository.findById(validation.userId);
    if (!user) throw new UnauthorizedException('User not found');

    this.checkAccountStatus(user);

    // Losing this race means another request already rotated the same token.
    const rotated = await this.sessionService.revokeForRotation(validation.sessionId);
    if (!rotated) throw new UnauthorizedException('Invalid or expired refresh token');

    const { sessionId: newSessionId, refreshToken: newRefreshToken } = await this.sessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
      validation.deviceId,
      validation.rememberMe,
    );
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

    await this.passwordHistoryService.assertNotRecentlyUsed(user.id, newPassword, user.passwordHash);

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(user.id, { passwordHash });
    await this.passwordHistoryService.remember(user.id, user.passwordHash);

    await this.sessionService.revokeAllUserSessions(user.id);
    this.eventEmitter.emit(AUTH_EVENTS.PASSWORD_RESET, { userId: user.id });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [user, pendingPolicies, roles] = await Promise.all([
      this.userRepository.findByIdSimple(userId),
      this.policyAcceptanceService.getPending(userId),
      this.userRepository.getRoleNames(userId),
    ]);
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
      hasPassword: user.passwordHash !== null,
      referralCode: user.referralCode,
      timezone: user.timezone,
      language: user.language,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      // ALL is a campaign-targeting value, not something a person is.
      gender: user.gender === 'ALL' ? null : user.gender,
      countryId: user.countryId,
      stateId: user.stateId,
      cityId: user.cityId,
      pendingPolicies,
      // So the portals can show only what the person may do, e.g. money actions to the finance team.
      roles,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    const { dateOfBirth, gender, stateId, cityId, ...basic } = data;
    const { data: demographics, changed } = await this.demographicsService.resolve({ dateOfBirth, gender, stateId, cityId }, { stateId: user.stateId });

    await this.userRepository.update(userId, { ...basic, ...demographics });
    // Personal details are logged as "changed", never with their values.
    this.eventEmitter.emit(AUTH_EVENTS.PROFILE_UPDATED, { userId, changes: { ...basic, ...changed } as Record<string, unknown> });

    return this.getProfile(userId);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserProfile> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Avatar too large. Maximum 5MB');
    }

    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    const uploadResult = await this.storageService.saveFile(file.buffer, file.originalname, 'profile', file.mimetype);
    
    // Optionally delete old avatar file if it's local (not an external URL)
    if (user.avatarUrl && !user.avatarUrl.startsWith('http')) {
      await this.storageService.deleteFile(user.avatarUrl).catch(() => {});
    }

    await this.userRepository.update(userId, { avatarUrl: uploadResult.path });
    return this.getProfile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');
    if (!user.passwordHash) throw new BadRequestException('Password not set. Use OTP login.');

    const isValid = await this.passwordService.verify(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    // Covers "same as the current password" as well as the last few before it.
    await this.passwordHistoryService.assertNotRecentlyUsed(userId, newPassword, user.passwordHash);

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(userId, { passwordHash });
    await this.passwordHistoryService.remember(userId, user.passwordHash);

    await this.sessionService.revokeAllUserSessions(userId);
    this.eventEmitter.emit(AUTH_EVENTS.PASSWORD_CHANGED, { userId });
  }

  /**
   * Closes the person's own account (app-store requirement). Refused while money is still owed either way: a balance
   * in the wallet, a withdrawal in flight, or a business account, which support closes. The email and phone are
   * freed for a future sign-up; the account row and its history stay, soft-deleted.
   */
  async deleteAccount(userId: string, currentPassword?: string): Promise<void> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    if (user.passwordHash) {
      const valid = !!currentPassword && (await this.passwordService.verify(currentPassword, user.passwordHash));
      if (!valid) throw new BadRequestException('Current password is incorrect');
    }

    const blockers = await this.userRepository.findDeletionBlockers(userId);
    if (blockers.ownsMerchant) {
      throw new BadRequestException('This account owns a business account. Please contact support to close it.', AUTH_ERRORS.ACCOUNT_DELETE_FAILED);
    }
    if (blockers.hasOpenWithdrawal) {
      throw new BadRequestException('You have a withdrawal in progress. Please wait for it to finish before deleting your account.', AUTH_ERRORS.ACCOUNT_DELETE_FAILED);
    }
    if (blockers.hasBalance) {
      throw new BadRequestException('Your wallet still has money in it, or rewards waiting to be approved. Please withdraw it before deleting your account.', AUTH_ERRORS.ACCOUNT_DELETE_FAILED);
    }

    await this.sessionService.revokeAllUserSessions(userId);
    await this.userRepository.deleteAndReleaseIdentifiers(userId);

    // The email is captured before it was cleared, so the listener can confirm the deletion to it.
    this.eventEmitter.emit(AUTH_EVENTS.ACCOUNT_DELETED, { userId, email: user.email });
  }

  async getPolicyStatus(userId: string) {
    return this.policyAcceptanceService.getStatus(userId);
  }

  async acceptPolicies(userId: string, ipAddress?: string, userAgent?: string) {
    return this.policyAcceptanceService.acceptCurrent(userId, ipAddress, userAgent);
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
