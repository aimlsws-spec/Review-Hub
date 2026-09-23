import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import appleSignin from 'apple-signin-auth';

import { AuthService } from '../services/auth.service';

import { AuthController } from './auth.controller';

// One shared fn across every `new OAuth2Client(...)` instance (AuthController makes one per test, since it's a
// class-field initializer) — `jest.clearAllMocks()` in beforeEach only resets call history, never the identity
// jest.mock returns, so referencing it directly here survives that reset (mock.results wouldn't).
const mockGoogleVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockGoogleVerifyIdToken })),
}));
jest.mock('apple-signin-auth', () => ({ __esModule: true, default: { verifyIdToken: jest.fn() } }));

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    socialLogin: jest.fn(),
    logout: jest.fn(),
    logoutAllDevices: jest.fn(),
    refreshTokens: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
    getActiveSessions: jest.fn(),
    getUserPermissions: jest.fn(),
    getUserRoles: jest.fn(),
    revokeRefreshToken: jest.fn(),
    updatePushToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with DTO data', async () => {
      const dto = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' };
      const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Mozilla/5.0' } } as unknown as import('express').Request;
      mockAuthService.register.mockResolvedValue({ user: {}, tokens: {} });

      await controller.register(dto, req);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto, '127.0.0.1', 'Mozilla/5.0', {
        isRooted: undefined,
        isEmulator: undefined,
        xForwardedFor: undefined,
        via: undefined,
        installId: undefined,
      });
    });
  });

  describe('login', () => {
    it('should call authService.login with credentials', async () => {
      const dto = { email: 'john@example.com', password: 'Pass@123' };
      const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Mozilla/5.0' } } as unknown as import('express').Request;
      mockAuthService.login.mockResolvedValue({ user: {}, tokens: {} });

      await controller.login(dto, req);

      expect(mockAuthService.login).toHaveBeenCalledWith('john@example.com', undefined, 'Pass@123', '127.0.0.1', 'Mozilla/5.0', undefined, {
        isRooted: undefined,
        isEmulator: undefined,
        xForwardedFor: undefined,
        via: undefined,
        installId: undefined,
      });
    });
  });

  describe('googleAuthCallback', () => {
    it('maps the Passport-populated req.user into a socialLogin call', async () => {
      const req = {
        user: { providerId: 'google-sub-1', email: 'john@example.com', firstName: 'John', lastName: 'Doe', avatarUrl: 'pic.jpg' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      } as unknown as import('express').Request;
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });

      await controller.googleAuthCallback(req);

      expect(mockAuthService.socialLogin).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-sub-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'pic.jpg',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        xForwardedFor: undefined,
        via: undefined,
        installId: undefined,
      });
    });
  });

  describe('appleAuthCallback', () => {
    it('maps the Passport-populated req.user into a socialLogin call', async () => {
      const req = {
        user: { providerId: 'apple-sub-1', email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      } as unknown as import('express').Request;
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });

      await controller.appleAuthCallback(req);

      expect(mockAuthService.socialLogin).toHaveBeenCalledWith({
        provider: 'apple',
        providerId: 'apple-sub-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        xForwardedFor: undefined,
        via: undefined,
        installId: undefined,
      });
    });
  });

  describe('googleMobileAuth', () => {
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Mozilla/5.0' } } as unknown as import('express').Request;

    const mockedVerifyIdToken = () => mockGoogleVerifyIdToken;

    it('verifies the token against this app\'s own client id, not just any Google client', async () => {
      mockedVerifyIdToken().mockResolvedValue({ getPayload: () => ({ sub: 'google-sub-1', email: 'a@example.com' }) });
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });
      process.env.GOOGLE_CLIENT_ID = 'expected-client-id.apps.googleusercontent.com';

      await controller.googleMobileAuth({ idToken: 'token-1' }, req);

      expect(mockedVerifyIdToken()).toHaveBeenCalledWith(
        expect.objectContaining({ idToken: 'token-1', audience: 'expected-client-id.apps.googleusercontent.com' }),
      );
    });

    it('signs in with the verified payload', async () => {
      mockedVerifyIdToken().mockResolvedValue({
        getPayload: () => ({ sub: 'google-sub-1', email: 'a@example.com', given_name: 'A', family_name: 'B', picture: 'http://x/pic.jpg' }),
      });
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });

      await controller.googleMobileAuth({ idToken: 'token-1' }, req);

      expect(mockAuthService.socialLogin).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google', providerId: 'google-sub-1', email: 'a@example.com', firstName: 'A', lastName: 'B' }),
      );
    });

    it('rejects a token that fails verification, without leaking the underlying error', async () => {
      mockedVerifyIdToken().mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));

      await expect(controller.googleMobileAuth({ idToken: 'token-1' }, req)).rejects.toThrow('Google authentication failed');
    });

    it('rejects a token with no usable payload', async () => {
      mockedVerifyIdToken().mockResolvedValue({ getPayload: () => null });

      await expect(controller.googleMobileAuth({ idToken: 'token-1' }, req)).rejects.toThrow('Google authentication failed');
    });
  });

  describe('appleMobileAuth', () => {
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Mozilla/5.0' } } as unknown as import('express').Request;
    const mockedAppleVerify = () => jest.mocked(appleSignin).verifyIdToken as jest.Mock;

    it('verifies the token against this app\'s own client id, not just any Apple app', async () => {
      mockedAppleVerify().mockResolvedValue({ sub: 'apple-sub-1', email: 'a@example.com' });
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });
      process.env.APPLE_CLIENT_ID = 'com.seawindsolution.viralkar.service';

      await controller.appleMobileAuth({ idToken: 'token-1' }, req);

      expect(mockedAppleVerify()).toHaveBeenCalledWith('token-1', expect.objectContaining({ audience: 'com.seawindsolution.viralkar.service' }));
    });

    it('signs in with the verified payload', async () => {
      mockedAppleVerify().mockResolvedValue({ sub: 'apple-sub-1', email: 'a@example.com' });
      mockAuthService.socialLogin.mockResolvedValue({ user: {}, tokens: {} });

      await controller.appleMobileAuth({ idToken: 'token-1', firstName: 'A', lastName: 'B' }, req);

      expect(mockAuthService.socialLogin).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'apple', providerId: 'apple-sub-1', email: 'a@example.com', firstName: 'A', lastName: 'B' }),
      );
    });

    it('rejects a token that fails verification', async () => {
      mockedAppleVerify().mockRejectedValue(new Error('jwt audience invalid'));

      await expect(controller.appleMobileAuth({ idToken: 'token-1' }, req)).rejects.toThrow('Apple authentication failed');
    });
  });

  describe('updatePushToken', () => {
    it('should call authService.updatePushToken with the session id and token', async () => {
      const user = { id: 'user-1', sessionId: 'session-1' };

      await controller.updatePushToken(user, { pushToken: 'fcm-token' });

      expect(mockAuthService.updatePushToken).toHaveBeenCalledWith('session-1', 'fcm-token');
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id and session id', async () => {
      const user = { id: 'user-1', sessionId: 'session-1' };

      await controller.logout(user);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1', 'session-1');
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAllDevices', async () => {
      await controller.logoutAll('user-1');

      expect(mockAuthService.logoutAllDevices).toHaveBeenCalledWith('user-1');
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens', async () => {
      const dto = { refreshToken: 'token' };
      const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Mozilla/5.0' } } as unknown as import('express').Request;

      await controller.refresh(dto, req);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('token', '127.0.0.1', 'Mozilla/5.0');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockAuthService.getProfile.mockResolvedValue({ id: 'user-1', email: 'john@example.com' });

      const result = await controller.getProfile('user-1');

      expect(result).toEqual({ id: 'user-1', email: 'john@example.com' });
    });
  });

  describe('updateProfile', () => {
    it('should call authService.updateProfile', async () => {
      const dto = { firstName: 'Jane' };
      mockAuthService.updateProfile.mockResolvedValue({ id: 'user-1', firstName: 'Jane' });

      await controller.updateProfile('user-1', dto);

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword', async () => {
      const dto = { currentPassword: 'old', newPassword: 'new' };

      await controller.changePassword('user-1', dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-1', 'old', 'new');
    });
  });

  describe('deleteAccount', () => {
    it('should call authService.deleteAccount', async () => {
      await controller.deleteAccount('user-1');

      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('sendOtp', () => {
    it('should call authService.sendOtp', async () => {
      const dto = { type: 'REGISTRATION' as import('@prisma/client').OtpType };

      await controller.sendOtp('user-1', dto);

      expect(mockAuthService.sendOtp).toHaveBeenCalledWith('user-1', 'REGISTRATION');
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOtp', async () => {
      const dto = { type: 'REGISTRATION' as import('@prisma/client').OtpType, code: '123456' };

      await controller.verifyOtp('user-1', dto);

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('user-1', 'REGISTRATION', '123456');
    });
  });

  describe('enableTwoFactor', () => {
    it('should call authService.enableTwoFactor', async () => {
      await controller.enableTwoFactor('user-1', '123456');

      expect(mockAuthService.enableTwoFactor).toHaveBeenCalledWith('user-1', '123456');
    });
  });
  describe('X-Device-ID header', () => {
    const request = (extra: Record<string, unknown> = {}) =>
      ({ ip: '203.0.113.9', headers: { 'user-agent': 'UA', 'x-device-id': 'install-1234-abcd', ...extra }, user: { providerId: 'p1', firstName: 'A', lastName: 'B' } }) as unknown as import('express').Request;

    it('never leaks the password or other request-body fields into the device signals', async () => {
      await controller.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'Secret@123' } as never, request());

      const signals = mockAuthService.register.mock.calls[0][3];
      expect(JSON.stringify(signals)).not.toContain('Secret@123');
      expect(Object.keys(signals).sort()).toEqual([
        'installId',
        'isAutomationDetected',
        'isEmulator',
        'isRooted',
        'via',
        'xForwardedFor',
      ]);
    });

    it('is passed to register as the install id, next to the other device signals', async () => {
      await controller.register({ firstName: 'A', lastName: 'B', password: 'x', isRooted: true } as never, request());

      expect(mockAuthService.register).toHaveBeenCalledWith(expect.anything(), '203.0.113.9', 'UA', {
        isRooted: true,
        isEmulator: undefined,
        xForwardedFor: undefined,
        via: undefined,
        installId: 'install-1234-abcd',
      });
    });

    it('is passed to login', async () => {
      await controller.login({ email: 'a@b.com', password: 'x' } as never, request());

      expect(mockAuthService.login.mock.calls[0][6]).toEqual(expect.objectContaining({ installId: 'install-1234-abcd' }));
    });

    it('is passed to Google and Apple sign-in', async () => {
      await controller.googleAuthCallback(request());
      await controller.appleAuthCallback(request());

      expect(mockAuthService.socialLogin).toHaveBeenNthCalledWith(1, expect.objectContaining({ provider: 'google', installId: 'install-1234-abcd' }));
      expect(mockAuthService.socialLogin).toHaveBeenNthCalledWith(2, expect.objectContaining({ provider: 'apple', installId: 'install-1234-abcd' }));
    });

    it('is optional: an app that does not send it still works', async () => {
      await controller.login({ email: 'a@b.com', password: 'x' } as never, { ip: '1.1.1.1', headers: {} } as never);

      expect(mockAuthService.login.mock.calls[0][6].installId).toBeUndefined();
    });

    it('carries the forwarded-for and via headers alongside it', async () => {
      await controller.login({ email: 'a@b.com', password: 'x' } as never, request({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2', via: '1.1 proxy' }));

      expect(mockAuthService.login.mock.calls[0][6]).toEqual(
        expect.objectContaining({ xForwardedFor: '1.1.1.1, 2.2.2.2', via: '1.1 proxy', installId: 'install-1234-abcd' }),
      );
    });
  });
});
