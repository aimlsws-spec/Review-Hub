import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@common/exceptions/domain.exceptions';

import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { UserRepository } from '../repositories/user.repository';

import { AuthService } from './auth.service';
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
    registerDevice: jest.fn().mockResolvedValue('device-1'),
    deactivateDevice: jest.fn().mockResolvedValue(undefined),
    deactivateAllDevices: jest.fn().mockResolvedValue(undefined),
    getUserDevices: jest.fn().mockResolvedValue([]),
    updatePushToken: jest.fn().mockResolvedValue(undefined),
  };

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
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
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
});
