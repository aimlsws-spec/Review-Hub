import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { SessionRepository } from '../repositories/session.repository';

import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  const mockSessionRepository = {
    create: jest.fn(),
    findLatestByRefreshTokenHash: jest.fn(),
    revoke: jest.fn(),
    revokeAllByUserId: jest.fn(),
    revokeIfActive: jest.fn(),
    findActiveByUserId: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepository, useValue: mockSessionRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);

    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session and return sessionId and refreshToken', async () => {
      const userId = 'user-1';
      const createdSession = { id: 'session-1' };
      mockSessionRepository.create.mockResolvedValue(createdSession);
      mockJwtService.sign.mockReturnValue('mock-refresh-token');

      const result = await service.createSession(userId, '127.0.0.1', 'Mozilla/5.0');

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: userId } },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
      expect(result).toHaveProperty('sessionId', 'session-1');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('gives every refresh token a unique id, so two sessions never share one', async () => {
      mockSessionRepository.create.mockResolvedValue({ id: 'session-1' });
      mockJwtService.sign.mockReturnValue('token');

      await service.createSession('user-1');
      await service.createSession('user-1');

      const firstId = mockJwtService.sign.mock.calls[0][1].jwtid;
      const secondId = mockJwtService.sign.mock.calls[1][1].jwtid;
      expect(firstId).toEqual(expect.any(String));
      expect(firstId).not.toEqual(secondId);
    });
  });

  describe('revokeForRotation', () => {
    it('reports whether this request was the one that revoked the session', async () => {
      mockSessionRepository.revokeIfActive.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(service.revokeForRotation('session-1')).resolves.toBe(true);
      await expect(service.revokeForRotation('session-1')).resolves.toBe(false);
    });
  });

  describe('validateRefreshToken', () => {
    it('should return userId and sessionId for valid token', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        status: 'ACTIVE',
        deviceId: 'device-1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual({ userId: 'user-1', sessionId: 'session-1', deviceId: 'device-1', rememberMe: false });
    });

    it('reports a session that lives longer than the default as remember-me', async () => {
      const createdAt = new Date();
      const session = {
        id: 'session-1',
        userId: 'user-1',
        status: 'ACTIVE',
        deviceId: null,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 30 * 86400000),
      };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual({ userId: 'user-1', sessionId: 'session-1', deviceId: undefined, rememberMe: true });
    });

    it('revokes every session of the account when a rotated token is used again after the grace window', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        status: 'REVOKED',
        revokedAt: new Date(Date.now() - 5 * 60 * 1000),
        expiresAt: new Date(Date.now() + 86400000),
      };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('stolen-token');

      expect(result).toBeNull();
      expect(mockSessionRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
    });

    it('only refuses a token rotated moments ago, since two tabs can refresh at once', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        status: 'REVOKED',
        revokedAt: new Date(Date.now() - 2000),
        expiresAt: new Date(Date.now() + 86400000),
      };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('raced-token');

      expect(result).toBeNull();
      expect(mockSessionRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('refuses an expired-status session without revoking anything', async () => {
      const session = { id: 'session-1', userId: 'user-1', status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000) };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('old-token');

      expect(result).toBeNull();
      expect(mockSessionRepository.revokeAllByUserId).not.toHaveBeenCalled();
      expect(mockSessionRepository.revoke).not.toHaveBeenCalled();
    });

    it('should return null for expired session', async () => {
      const session = { id: 'session-1', userId: 'user-1', status: 'ACTIVE', expiresAt: new Date(Date.now() - 1000) };
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(session);
      mockSessionRepository.revoke.mockResolvedValue(undefined);

      const result = await service.validateRefreshToken('expired-token');

      expect(result).toBeNull();
      expect(mockSessionRepository.revoke).toHaveBeenCalledWith('session-1');
    });

    it('should return null when session not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockSessionRepository.findLatestByRefreshTokenHash.mockResolvedValue(null);

      const result = await service.validateRefreshToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate access token and return expiresIn', async () => {
      mockJwtService.sign.mockReturnValue('access-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.generateTokens('user-1', 'session-1', ['USER']);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'access', role: ['USER'], sessionId: 'session-1' }),
        expect.any(Object),
      );
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.expiresIn).toBe('number');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session by id', async () => {
      await service.revokeSession('session-1');
      expect(mockSessionRepository.revoke).toHaveBeenCalledWith('session-1');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      await service.revokeAllUserSessions('user-1');
      expect(mockSessionRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should exclude a specific session when provided', async () => {
      await service.revokeAllUserSessions('user-1', 'session-1');
      expect(mockSessionRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1', 'session-1');
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for a user', async () => {
      const sessions = [{ id: 'session-1', userId: 'user-1' }];
      mockSessionRepository.findActiveByUserId.mockResolvedValue(sessions);

      const result = await service.getActiveSessions('user-1');

      expect(result).toEqual(sessions);
    });
  });
});
