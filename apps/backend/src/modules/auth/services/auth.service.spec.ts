import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { IpReputationService } from '../../risk/services';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { UserRepository } from '../repositories/user.repository';

import { AuthService } from './auth.service';
import { DemographicsService } from './demographics.service';
import { DeviceService } from './device.service';
import { NewDeviceService } from './new-device.service';
import { OtpService } from './otp.service';
import { PasswordHistoryService } from './password-history.service';
import { PasswordService } from './password.service';
import { PolicyAcceptanceService } from './policy-acceptance.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findByEmailOrPhone: jest.fn(),
    findById: jest.fn(),
    findByIdSimple: jest.fn(),
    findByReferralCode: jest.fn(),
    findByGoogleId: jest.fn(),
    findByAppleId: jest.fn(),
    findByEmail: jest.fn(),
    getRoleNames: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    deleteAndReleaseIdentifiers: jest.fn(),
    findDeletionBlockers: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    resetFailedAttempts: jest.fn(),
    lockAccount: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    generateTokens: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeSession: jest.fn(),
    revokeForRotation: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    getActiveSessions: jest.fn(),
    getSessionById: jest.fn(),
  };

  const mockDeviceService = {
    parseUserAgent: jest.fn().mockReturnValue({ platform: 'WEB', os: 'Windows', name: 'Chrome' }),
    generateFingerprint: jest.fn().mockReturnValue('mock-fingerprint'),
    detectVpnSuspicion: jest.fn().mockReturnValue(false),
    hashInstallId: jest.fn((raw?: string) => (raw ? `hashed:${raw}` : undefined)),
    registerDevice: jest.fn().mockResolvedValue('device-1'),
    deactivateDevice: jest.fn().mockResolvedValue(undefined),
    deactivateAllDevices: jest.fn().mockResolvedValue(undefined),
    getUserDevices: jest.fn().mockResolvedValue([]),
    updatePushToken: jest.fn().mockResolvedValue(undefined),
    clearPushToken: jest.fn().mockResolvedValue(undefined),
    clearPushTokensForUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockDemographicsService = { resolve: jest.fn() };
  const mockIpReputation = { isAnonymizer: jest.fn() };
  const mockConfig = { get: jest.fn() };

  const mockPasswordHistoryService = { assertNotRecentlyUsed: jest.fn(), remember: jest.fn() };

  const mockPasswordService = {
    hash: jest.fn(),
    verify: jest.fn(),
    validateStrength: jest.fn(),
  };

  const mockOtpService = {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  };

  const mockLoginHistoryRepository = {
    create: jest.fn(),
    markLogout: jest.fn(),
    findByUserId: jest.fn().mockResolvedValue([]),
    getRecentFailedAttempts: jest.fn().mockResolvedValue(0),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockNewDeviceService = {
    isUnrecognised: jest.fn(),
    createChallenge: jest.fn(),
    findChallenge: jest.fn(),
    consumeChallenge: jest.fn(),
  };

  const mockPolicyAcceptanceService = {
    acceptCurrent: jest.fn(),
    getPending: jest.fn(),
    getStatus: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    passwordHash: 'hashed-password',
    avatarUrl: null,
    status: 'ACTIVE',
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    isTwoFactorEnabled: false,
    referralCode: 'REF123',
    timezone: 'UTC',
    language: 'en',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    userRoles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: SessionService, useValue: mockSessionService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: PasswordHistoryService, useValue: mockPasswordHistoryService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: LoginHistoryRepository, useValue: mockLoginHistoryRepository },
        { provide: DemographicsService, useValue: mockDemographicsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LocalStorageService, useValue: { saveFile: jest.fn(), deleteFile: jest.fn() } },
        { provide: IpReputationService, useValue: mockIpReputation },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NewDeviceService, useValue: mockNewDeviceService },
        { provide: PolicyAcceptanceService, useValue: mockPolicyAcceptanceService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    // Not behind a trusted proxy, and no VPN, unless a test says so.
    mockIpReputation.isAnonymizer.mockReturnValue(false);
    mockConfig.get.mockReturnValue(false);
    mockDeviceService.detectVpnSuspicion.mockReturnValue(false);
    mockDemographicsService.resolve.mockResolvedValue({ data: {}, changed: {} });
    mockDeviceService.hashInstallId.mockImplementation((raw?: string) => (raw ? `hashed:${raw}` : undefined));
    // A recognised device and nothing left to accept, unless a test says otherwise.
    mockNewDeviceService.isUnrecognised.mockResolvedValue(false);
    mockPolicyAcceptanceService.getPending.mockResolvedValue([]);
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });

      const result = await service.register(
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123', acceptPolicies: true },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    describe('with demographics', () => {
      const withDetails = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass@123',
        acceptPolicies: true,
        dateOfBirth: '1998-04-21',
        gender: 'MALE' as const,
        cityId: 'city-amd',
      };

      beforeEach(() => {
        mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);
        mockPasswordService.hash.mockResolvedValue('hashed');
        mockUserRepository.create.mockResolvedValue(mockUser);
        mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
        mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });
      });

      it('saves the resolved columns with the new user', async () => {
        const columns = { dateOfBirth: new Date('1998-04-21T00:00:00.000Z'), gender: 'MALE', countryId: 'c-in', stateId: 's-gj', cityId: 'city-amd' };
        mockDemographicsService.resolve.mockResolvedValue({ data: columns, changed: {} });

        await service.register(withDetails);

        expect(mockDemographicsService.resolve).toHaveBeenCalledWith(withDetails);
        expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining(columns));
      });

      it('creates no account when the details are refused', async () => {
        mockDemographicsService.resolve.mockRejectedValue(new BadRequestException('That city was not found'));

        await expect(service.register(withDetails)).rejects.toThrow(BadRequestException);

        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(mockPasswordService.hash).not.toHaveBeenCalled();
      });

      it('sends nothing extra when no details were given', async () => {
        await service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123', acceptPolicies: true });

        const created = mockUserRepository.create.mock.calls[0][0];
        expect(created).not.toHaveProperty('dateOfBirth');
        expect(created).not.toHaveProperty('cityId');
      });
    });

    it('should throw ConflictException if user exists', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(mockUser);

      await expect(
        service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123', acceptPolicies: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user and return tokens', async () => {
      const user = { ...mockUser, status: 'ACTIVE' as const };
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);
      mockUserRepository.getRoleNames.mockResolvedValue(['USER']);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });

      const result = await service.login('john@example.com', undefined, 'Pass@123', '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('tokens');
      expect(mockUserRepository.resetFailedAttempts).toHaveBeenCalled();
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalled();
      // Regression: the session must link to the device registered for this login,
      // otherwise nothing that targets "this session's device" (e.g. push tokens) works.
      expect(mockDeviceService.registerDevice).toHaveBeenCalled();
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        user.id, '127.0.0.1', 'Mozilla/5.0', 'device-1', false,
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);

      await expect(service.login('john@example.com', undefined, 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should handle failed login attempts and lock account', async () => {
      const user = { ...mockUser, status: 'ACTIVE' as const, failedLoginAttempts: 4 };
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.login('john@example.com', undefined, 'wrong')).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.incrementFailedAttempts).toHaveBeenCalled();
      expect(mockUserRepository.lockAccount).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke session when sessionId provided', async () => {
      await service.logout('user-1', 'session-1');

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-1');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should revoke all sessions when no sessionId', async () => {
      await service.logout('user-1');

      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
      expect(mockDeviceService.clearPushTokensForUser).toHaveBeenCalledWith('user-1');
    });

    it('stops push to the signed-out device, so it no longer shows notifications for this user', async () => {
      mockSessionService.getSessionById.mockResolvedValue({ id: 'session-1', deviceId: 'device-1' });

      await service.logout('user-1', 'session-1');

      expect(mockDeviceService.clearPushToken).toHaveBeenCalledWith('device-1');
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('updatePushToken', () => {
    it('should update the session device push token', async () => {
      mockSessionService.getSessionById.mockResolvedValue({ id: 'session-1', deviceId: 'device-1' });

      await service.updatePushToken('session-1', 'fcm-token');

      expect(mockSessionService.getSessionById).toHaveBeenCalledWith('session-1');
      expect(mockDeviceService.updatePushToken).toHaveBeenCalledWith('device-1', 'fcm-token');
    });

    it('should no-op when no sessionId is given', async () => {
      await service.updatePushToken(undefined, 'fcm-token');

      expect(mockSessionService.getSessionById).not.toHaveBeenCalled();
      expect(mockDeviceService.updatePushToken).not.toHaveBeenCalled();
    });

    it('should no-op when the session has no linked device', async () => {
      mockSessionService.getSessionById.mockResolvedValue({ id: 'session-1', deviceId: null });

      await service.updatePushToken('session-1', 'fcm-token');

      expect(mockDeviceService.updatePushToken).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should rotate tokens, keeping the device and remember-me of the old session', async () => {
      mockSessionService.validateRefreshToken.mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
        deviceId: 'device-1',
        rememberMe: true,
      });
      mockSessionService.revokeForRotation.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.getRoleNames.mockResolvedValue(['USER']);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-2', refreshToken: 'new-refresh' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'new-access', expiresIn: 900 });

      const result = await service.refreshTokens('old-token', '1.2.3.4', 'agent');

      expect(mockSessionService.revokeForRotation).toHaveBeenCalledWith('session-1');
      expect(mockSessionService.createSession).toHaveBeenCalledWith('user-1', '1.2.3.4', 'agent', 'device-1', true);
      expect(result).toHaveProperty('accessToken', 'new-access');
      expect(result).toHaveProperty('refreshToken', 'new-refresh');
    });

    it('refuses when another request rotated the same token first', async () => {
      mockSessionService.validateRefreshToken.mockResolvedValue({ userId: 'user-1', sessionId: 'session-1', rememberMe: false });
      mockSessionService.revokeForRotation.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(service.refreshTokens('old-token')).rejects.toThrow('Invalid or expired refresh token');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password and revoke sessions', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValueOnce(true);
      mockPasswordService.hash.mockResolvedValue('new-hash');

      await service.changePassword('user-1', 'OldPass@123', 'NewPass@456');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { passwordHash: 'new-hash' });
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
      // The password being replaced goes into the history, so it can not be set again next time.
      expect(mockPasswordHistoryService.remember).toHaveBeenCalledWith('user-1', mockUser.passwordHash);
    });

    it('refuses a password used recently, before changing anything', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockPasswordHistoryService.assertNotRecentlyUsed.mockRejectedValueOnce(new BadRequestException('You have used this password recently.'));

      await expect(service.changePassword('user-1', 'OldPass@123', 'Reused@123')).rejects.toThrow(/used this password recently/);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockPasswordHistoryService.remember).not.toHaveBeenCalled();
    });

    it('should throw if current password is incorrect', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.changePassword('user-1', 'wrong', 'NewPass@456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAccount', () => {
    const noBlockers = { hasBalance: false, hasOpenWithdrawal: false, ownsMerchant: false };

    beforeEach(() => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockUserRepository.findDeletionBlockers.mockResolvedValue(noBlockers);
      mockPasswordService.verify.mockResolvedValue(true);
    });

    it('deletes the account, frees its email and phone, and revokes every session', async () => {
      await service.deleteAccount('user-1', 'Passw0rd!23');

      expect(mockPasswordService.verify).toHaveBeenCalledWith('Passw0rd!23', 'hashed-password');
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
      expect(mockUserRepository.deleteAndReleaseIdentifiers).toHaveBeenCalledWith('user-1');
      // The email is passed along because it is cleared from the account, and the confirmation still needs it.
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.account.deleted', { userId: 'user-1', email: 'john@example.com' });
    });

    it('refuses without the right password when the account has one', async () => {
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.deleteAccount('user-1', 'wrong')).rejects.toThrow('Current password is incorrect');
      await expect(service.deleteAccount('user-1')).rejects.toThrow('Current password is incorrect');
      expect(mockUserRepository.deleteAndReleaseIdentifiers).not.toHaveBeenCalled();
    });

    it('needs no password for an account that never had one (Google/Apple only)', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, passwordHash: null });

      await service.deleteAccount('user-1');

      expect(mockPasswordService.verify).not.toHaveBeenCalled();
      expect(mockUserRepository.deleteAndReleaseIdentifiers).toHaveBeenCalledWith('user-1');
    });

    it.each([
      ['money in the wallet', { hasBalance: true }, 'withdraw it'],
      ['a withdrawal in progress', { hasOpenWithdrawal: true }, 'withdrawal in progress'],
      ['a business account', { ownsMerchant: true }, 'contact support'],
    ])('refuses while the account has %s', async (_label, blocker, message) => {
      mockUserRepository.findDeletionBlockers.mockResolvedValue({ ...noBlockers, ...blocker });

      await expect(service.deleteAccount('user-1', 'Passw0rd!23')).rejects.toThrow(message);

      expect(mockSessionService.revokeAllUserSessions).not.toHaveBeenCalled();
      expect(mockUserRepository.deleteAndReleaseIdentifiers).not.toHaveBeenCalled();
    });
  });

  describe('policy acceptance', () => {
    it('records acceptance of the current policies when an account is created', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });

      await service.register(
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Passw0rd!23', acceptPolicies: true },
        '127.0.0.1',
        'UA',
      );

      expect(mockPolicyAcceptanceService.acceptCurrent).toHaveBeenCalledWith('user-1', '127.0.0.1', 'UA');
    });

    it('creates no account when the policies were not accepted', async () => {
      await expect(
        service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Passw0rd!23', acceptPolicies: false }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('lists the documents still to accept on the profile', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPolicyAcceptanceService.getPending.mockResolvedValue(['REWARD_POLICY']);

      const profile = await service.getProfile('user-1');

      expect(profile.pendingPolicies).toEqual(['REWARD_POLICY']);
    });

    it('says whether the account has a password to confirm actions with', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.getProfile('user-1')).resolves.toEqual(expect.objectContaining({ hasPassword: false }));
    });
  });

  describe('sign-in from a new device', () => {
    const pending = {
      userId: 'user-1',
      rememberMe: true,
      installIdHash: 'hashed:install-2',
      isRooted: false,
      isEmulator: false,
      isAutomationDetected: false,
      vpnSuspected: false,
    };

    beforeEach(() => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(mockUser);
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockUserRepository.getRoleNames.mockResolvedValue(['USER']);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });
      mockNewDeviceService.isUnrecognised.mockResolvedValue(true);
      mockNewDeviceService.createChallenge.mockResolvedValue('challenge-token');
      mockOtpService.sendOtp.mockResolvedValue({ message: 'OTP sent successfully', expiresIn: 300 });
    });

    it('holds the sign-in and sends a code instead of opening a session', async () => {
      const result = await service.login('john@example.com', undefined, 'Passw0rd!23', '1.2.3.4', 'UA', true, { installId: 'install-2' });

      expect(result).toEqual({
        requiresVerification: true,
        reason: 'NEW_DEVICE',
        challengeToken: 'challenge-token',
        expiresIn: 300,
        sentTo: ['j****n@example.com', '****3210'],
      });
      expect(mockNewDeviceService.isUnrecognised).toHaveBeenCalledWith('user-1', 'hashed:install-2');
      expect(mockNewDeviceService.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', rememberMe: true, installIdHash: 'hashed:install-2' }));
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith('user-1', 'NEW_DEVICE_LOGIN');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it('reuses the code already sent when signing in again within the cooldown', async () => {
      mockOtpService.sendOtp.mockRejectedValue(new BadRequestException('Please wait a minute before asking for another code.', 'OTP_RESEND_COOLDOWN'));
      mockConfig.get.mockImplementation((key: string, fallback: unknown) => (key === 'OTP_EXPIRY_MINUTES' ? '5' : fallback));

      const result = await service.login('john@example.com', undefined, 'Passw0rd!23');

      expect(result).toEqual(expect.objectContaining({ requiresVerification: true, expiresIn: 300 }));
    });

    it('lets the sign-in through when there is nowhere to send a code', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue({ ...mockUser, email: null, phone: null });

      const result = await service.login(undefined, '+919876543210', 'Passw0rd!23');

      expect(result).toHaveProperty('tokens');
      expect(mockOtpService.sendOtp).not.toHaveBeenCalled();
    });

    it('opens the session once the right code comes back from the same device, and sends the alert', async () => {
      mockNewDeviceService.findChallenge.mockResolvedValue(pending);

      const result = await service.verifyNewDevice('challenge-token', '123456', 'install-2', '1.2.3.4', 'UA');

      expect(mockNewDeviceService.findChallenge).toHaveBeenCalledWith('challenge-token', 'hashed:install-2');
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('user-1', 'NEW_DEVICE_LOGIN', '123456');
      expect(mockNewDeviceService.consumeChallenge).toHaveBeenCalledWith('challenge-token');
      expect(mockDeviceService.registerDevice).toHaveBeenCalledWith('user-1', expect.objectContaining({ installId: 'hashed:install-2' }));
      expect(mockSessionService.createSession).toHaveBeenCalledWith('user-1', '1.2.3.4', 'UA', 'device-1', true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.login.new_device', expect.objectContaining({ userId: 'user-1', ipAddress: '1.2.3.4' }));
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('opens no session for a wrong code', async () => {
      mockNewDeviceService.findChallenge.mockResolvedValue(pending);
      mockOtpService.verifyOtp.mockRejectedValue(new BadRequestException('OTP_INVALID'));

      await expect(service.verifyNewDevice('challenge-token', '000000', 'install-2')).rejects.toThrow('OTP_INVALID');

      expect(mockNewDeviceService.consumeChallenge).not.toHaveBeenCalled();
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it('refuses an expired challenge, or one from another device', async () => {
      mockNewDeviceService.findChallenge.mockResolvedValue(null);

      await expect(service.verifyNewDevice('challenge-token', '123456', 'install-9')).rejects.toThrow(UnauthorizedException);
      expect(mockOtpService.verifyOtp).not.toHaveBeenCalled();
    });

    it('refuses when the account was suspended while the code was on its way', async () => {
      mockNewDeviceService.findChallenge.mockResolvedValue(pending);
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });

      await expect(service.verifyNewDevice('challenge-token', '123456', 'install-2')).rejects.toThrow(UnauthorizedException);
      expect(mockOtpService.verifyOtp).not.toHaveBeenCalled();
    });

    it('resends the code for a waiting sign-in', async () => {
      mockNewDeviceService.findChallenge.mockResolvedValue(pending);
      mockOtpService.resendOtp.mockResolvedValue({ message: 'OTP sent successfully', expiresIn: 300 });

      await service.resendNewDeviceCode('challenge-token', 'install-2');

      expect(mockOtpService.resendOtp).toHaveBeenCalledWith('user-1', 'NEW_DEVICE_LOGIN');
    });

    it('asks for a code on a known device when two-factor sign-in is on, without the new-device alert', async () => {
      const twoFactorUser = { ...mockUser, isTwoFactorEnabled: true };
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(twoFactorUser);
      mockUserRepository.findByIdSimple.mockResolvedValue(twoFactorUser);
      mockNewDeviceService.isUnrecognised.mockResolvedValue(false);

      const result = await service.login('john@example.com', undefined, 'Passw0rd!23', '1.2.3.4', 'UA', false, { installId: 'install-1' });

      expect(result).toEqual(expect.objectContaining({ requiresVerification: true, reason: 'TWO_FACTOR' }));
      expect(mockNewDeviceService.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ isNewDevice: false }));
      expect(mockSessionService.createSession).not.toHaveBeenCalled();

      mockNewDeviceService.findChallenge.mockResolvedValue({ ...pending, isNewDevice: false });
      mockOtpService.verifyOtp.mockResolvedValue(true);
      await service.verifyNewDevice('challenge-token', '123456', 'install-2', '1.2.3.4', 'UA');

      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('auth.login.new_device', expect.anything());
    });

    it('refuses a two-factor sign-in when there is nowhere to send the code', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue({ ...mockUser, email: null, phone: null, isTwoFactorEnabled: true });
      mockNewDeviceService.isUnrecognised.mockResolvedValue(false);

      await expect(service.login(undefined, '+919876543210', 'Passw0rd!23')).rejects.toThrow(UnauthorizedException);
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it('sends no alert for a recognised device', async () => {
      mockNewDeviceService.isUnrecognised.mockResolvedValue(false);

      await service.login('john@example.com', undefined, 'Passw0rd!23');

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('auth.login.new_device', expect.anything());
    });

    it('alerts, without asking for a code, on a Google/Apple sign-in from a new device', async () => {
      mockUserRepository.findByGoogleId.mockResolvedValue(mockUser);

      const result = await service.socialLogin({ provider: 'google', providerId: 'google-sub-1', firstName: 'John', lastName: 'Doe', installId: 'install-2' });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(mockOtpService.sendOtp).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.login.new_device', expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('enableTwoFactor', () => {
    it('should enable 2FA after OTP verification', async () => {
      const user = { ...mockUser, isTwoFactorEnabled: false };
      mockUserRepository.findByIdSimple.mockResolvedValue(user);
      mockOtpService.verifyOtp.mockResolvedValue(true);

      const result = await service.enableTwoFactor('user-1', '123456');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { isTwoFactorEnabled: true });
      expect(result.message).toContain('enabled');
    });

    it('should throw if 2FA already enabled', async () => {
      const user = { ...mockUser, isTwoFactorEnabled: true };
      mockUserRepository.findByIdSimple.mockResolvedValue(user);

      await expect(service.enableTwoFactor('user-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable 2FA after OTP verification', async () => {
      const user = { ...mockUser, isTwoFactorEnabled: true };
      mockUserRepository.findByIdSimple.mockResolvedValue(user);
      mockOtpService.verifyOtp.mockResolvedValue(true);

      const result = await service.disableTwoFactor('user-1', '123456');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { isTwoFactorEnabled: false });
      expect(result.message).toContain('disabled');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('email', 'john@example.com');
    });

    it('includes the roles, so the portals can show only what the person may do', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockUserRepository.getRoleNames.mockResolvedValue(['ADMIN', 'FINANCE_TEAM']);

      await expect(service.getProfile('user-1')).resolves.toEqual(expect.objectContaining({ roles: ['ADMIN', 'FINANCE_TEAM'] }));
    });

    it('should throw if user not found', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns the date of birth as YYYY-MM-DD, with gender and location', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({
        ...mockUser,
        dateOfBirth: new Date('1998-04-21T00:00:00.000Z'),
        gender: 'FEMALE',
        countryId: 'c-in',
        stateId: 's-gj',
        cityId: 'city-amd',
      });

      const result = await service.getProfile('user-1');

      expect(result).toMatchObject({ dateOfBirth: '1998-04-21', gender: 'FEMALE', countryId: 'c-in', stateId: 's-gj', cityId: 'city-amd' });
    });

    it('returns nulls for details nobody has given yet', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, dateOfBirth: null, gender: null, countryId: null, stateId: null, cityId: null });

      const result = await service.getProfile('user-1');

      expect(result).toMatchObject({ dateOfBirth: null, gender: null, countryId: null, stateId: null, cityId: null });
    });

    it('hides the campaign-only gender value ALL, which is not something a person is', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, gender: 'ALL' });

      expect((await service.getProfile('user-1')).gender).toBeNull();
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...mockUser, stateId: 's-mh' });
      mockUserRepository.update.mockResolvedValue(mockUser);
    });

    it('updates the basic fields', async () => {
      await service.updateProfile('user-1', { firstName: 'Jane', language: 'hi' });

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { firstName: 'Jane', language: 'hi' });
    });

    it('resolves the demographics against the saved state and saves the resulting columns', async () => {
      mockDemographicsService.resolve.mockResolvedValue({
        data: { gender: 'FEMALE', cityId: null },
        changed: { gender: 'updated' },
      });

      await service.updateProfile('user-1', { firstName: 'Jane', gender: 'FEMALE', stateId: 's-gj' });

      expect(mockDemographicsService.resolve).toHaveBeenCalledWith(
        { dateOfBirth: undefined, gender: 'FEMALE', stateId: 's-gj', cityId: undefined },
        { stateId: 's-mh' },
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { firstName: 'Jane', gender: 'FEMALE', cityId: null });
    });

    it('logs that personal details changed, but never their values', async () => {
      mockDemographicsService.resolve.mockResolvedValue({
        data: { dateOfBirth: new Date('1998-04-21T00:00:00.000Z') },
        changed: { dateOfBirth: 'updated' },
      });

      await service.updateProfile('user-1', { firstName: 'Jane', dateOfBirth: '1998-04-21' });

      const event = mockEventEmitter.emit.mock.calls.find(([name]) => name === 'auth.profile.updated');
      expect(event?.[1].changes).toEqual({ firstName: 'Jane', dateOfBirth: 'updated' });
      expect(JSON.stringify(event?.[1])).not.toContain('1998');
    });

    it('saves nothing when the details are refused', async () => {
      mockDemographicsService.resolve.mockRejectedValue(new BadRequestException('That state was not found'));

      await expect(service.updateProfile('user-1', { stateId: 'nope' })).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('throws when the user does not exist', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(null);

      await expect(service.updateProfile('nobody', { firstName: 'Jane' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('socialLogin', () => {
    beforeEach(() => {
      mockUserRepository.getRoleNames.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });
    });

    it('logs in directly when the Google id is already linked', async () => {
      mockUserRepository.findByGoogleId.mockResolvedValue(mockUser);

      const result = await service.socialLogin({
        provider: 'google',
        providerId: 'google-sub-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('access-token');
      // Regression: same device-before-session ordering bug as login().
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        mockUser.id, undefined, undefined, 'device-1', false,
      );
    });

    it('links a new Apple id to an existing account with a matching verified email', async () => {
      mockUserRepository.findByAppleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ ...mockUser, appleId: 'apple-sub-1' });

      await service.socialLogin({
        provider: 'apple',
        providerId: 'apple-sub-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ appleId: 'apple-sub-1' }),
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('provisions a new, pre-verified account when no match exists', async () => {
      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ ...mockUser, id: 'user-2', googleId: 'google-sub-2' });

      const result = await service.socialLogin({
        provider: 'google',
        providerId: 'google-sub-2',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ googleId: 'google-sub-2', status: 'ACTIVE' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.stringContaining('registered'), expect.anything());
      expect(result.user.id).toBe('user-2');
    });

    it('throws when the linked account is suspended', async () => {
      mockUserRepository.findByGoogleId.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });

      await expect(
        service.socialLogin({ provider: 'google', providerId: 'google-sub-1', firstName: 'John', lastName: 'Doe' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
  describe('VPN and device identity signals', () => {
    const arrangeRegister = () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });
    };
    const arrangeLogin = () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue({ ...mockUser, status: 'ACTIVE' as const });
      mockPasswordService.verify.mockResolvedValue(true);
      mockUserRepository.getRoleNames.mockResolvedValue(['USER']);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });
    };
    const registerWith = (ip: string, signals = {}) =>
      service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123', acceptPolicies: true }, ip, 'UA', signals);
    const loginWith = (ip: string, signals = {}) =>
      service.login('john@example.com', undefined, 'Pass@123', ip, 'UA', false, signals);
    const lastDevice = () => mockDeviceService.registerDevice.mock.calls.at(-1)?.[1];

    it('flags a device when the login IP is on a VPN or datacenter list', async () => {
      arrangeLogin();
      mockIpReputation.isAnonymizer.mockReturnValue(true);

      await loginWith('203.0.113.9');

      expect(mockIpReputation.isAnonymizer).toHaveBeenCalledWith('203.0.113.9');
      expect(lastDevice().vpnSuspected).toBe(true);
    });

    it('flags a device at registration too', async () => {
      arrangeRegister();
      mockIpReputation.isAnonymizer.mockReturnValue(true);

      await registerWith('203.0.113.9');

      expect(lastDevice().vpnSuspected).toBe(true);
    });

    it('does not flag a clean address', async () => {
      arrangeLogin();

      await loginWith('198.51.100.7');

      expect(lastDevice().vpnSuspected).toBe(false);
    });

    it('still uses the header heuristic when the app is NOT behind a trusted proxy', async () => {
      arrangeLogin();
      mockDeviceService.detectVpnSuspicion.mockReturnValue(true);

      await loginWith('198.51.100.7', { xForwardedFor: '1.1.1.1, 2.2.2.2' });

      expect(mockDeviceService.detectVpnSuspicion).toHaveBeenCalledWith({ xForwardedFor: '1.1.1.1, 2.2.2.2' , via: undefined });
      expect(lastDevice().vpnSuspected).toBe(true);
    });

    it('ignores the header heuristic behind a trusted proxy, where several X-Forwarded-For hops are normal for everybody', async () => {
      arrangeLogin();
      mockConfig.get.mockReturnValue(1);
      mockDeviceService.detectVpnSuspicion.mockReturnValue(true);

      await loginWith('198.51.100.7', { xForwardedFor: '1.1.1.1, 2.2.2.2', via: '1.1 cdn' });

      expect(mockDeviceService.detectVpnSuspicion).not.toHaveBeenCalled();
      expect(lastDevice().vpnSuspected).toBe(false);
    });

    it('still flags a listed address behind a trusted proxy', async () => {
      arrangeLogin();
      mockConfig.get.mockReturnValue(1);
      mockIpReputation.isAnonymizer.mockReturnValue(true);

      await loginWith('203.0.113.9');

      expect(lastDevice().vpnSuspected).toBe(true);
    });

    it('stores the hashed install id the app sent, on register and on login', async () => {
      arrangeRegister();
      await registerWith('198.51.100.7', { installId: 'install-1234-abcd' });
      expect(mockDeviceService.hashInstallId).toHaveBeenCalledWith('install-1234-abcd');
      expect(lastDevice().installId).toBe('hashed:install-1234-abcd');

      arrangeLogin();
      await loginWith('198.51.100.7', { installId: 'install-1234-abcd' });
      expect(lastDevice().installId).toBe('hashed:install-1234-abcd');
    });

    it('registers the device without an install id when the app did not send one', async () => {
      arrangeLogin();

      await loginWith('198.51.100.7');

      expect(lastDevice().installId).toBeUndefined();
    });
  });
});
