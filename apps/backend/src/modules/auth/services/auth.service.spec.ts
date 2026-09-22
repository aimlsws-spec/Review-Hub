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
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
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
  };

  const mockDemographicsService = { resolve: jest.fn() };
  const mockIpReputation = { isAnonymizer: jest.fn() };
  const mockConfig = { get: jest.fn() };

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
        { provide: OtpService, useValue: mockOtpService },
        { provide: LoginHistoryRepository, useValue: mockLoginHistoryRepository },
        { provide: DemographicsService, useValue: mockDemographicsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LocalStorageService, useValue: { saveFile: jest.fn(), deleteFile: jest.fn() } },
        { provide: IpReputationService, useValue: mockIpReputation },
        { provide: ConfigService, useValue: mockConfig },
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
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-token' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'access-token', expiresIn: 900 });

      const result = await service.register(
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' },
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
        await service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' });

        const created = mockUserRepository.create.mock.calls[0][0];
        expect(created).not.toHaveProperty('dateOfBirth');
        expect(created).not.toHaveProperty('cityId');
      });
    });

    it('should throw ConflictException if user exists', async () => {
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(mockUser);

      await expect(
        service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' }),
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
    it('should rotate tokens', async () => {
      mockSessionService.validateRefreshToken.mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.getRoleNames.mockResolvedValue(['USER']);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'session-2', refreshToken: 'new-refresh' });
      mockSessionService.generateTokens.mockReturnValue({ accessToken: 'new-access', expiresIn: 900 });

      const result = await service.refreshTokens('old-token');

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-1');
      expect(result).toHaveProperty('accessToken', 'new-access');
      expect(result).toHaveProperty('refreshToken', 'new-refresh');
    });
  });

  describe('changePassword', () => {
    it('should change password and revoke sessions', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockPasswordService.hash.mockResolvedValue('new-hash');

      await service.changePassword('user-1', 'OldPass@123', 'NewPass@456');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { passwordHash: 'new-hash' });
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    });

    it('should throw if current password is incorrect', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.changePassword('user-1', 'wrong', 'NewPass@456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user and revoke sessions', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue(mockUser);

      await service.deleteAccount('user-1');

      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith('user-1');
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
        mockUser.id, undefined, undefined, 'device-1',
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
      service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' }, ip, 'UA', signals);
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
