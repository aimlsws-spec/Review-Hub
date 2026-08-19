import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SessionRepository } from './session.repository';

describe('SessionRepository', () => {
  let repository: SessionRepository;

  const mockPrisma = {
    userSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<SessionRepository>(SessionRepository);

    jest.clearAllMocks();
  });

  describe('findByRefreshTokenHash', () => {
    it('should find active session by refresh token hash', async () => {
      const session = { id: 'session-1', refreshTokenHash: 'hash', status: 'ACTIVE' };
      mockPrisma.userSession.findFirst.mockResolvedValue(session);

      const result = await repository.findByRefreshTokenHash('hash');

      expect(result).toEqual(session);
      expect(mockPrisma.userSession.findFirst).toHaveBeenCalledWith({
        where: { refreshTokenHash: 'hash', status: 'ACTIVE' },
      });
    });
  });

  describe('create', () => {
    it('should create a session', async () => {
      const data = {
        user: { connect: { id: 'user-1' } },
        refreshTokenHash: 'hash',
        expiresAt: new Date(),
      };
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-1', ...data });

      const result = await repository.create(data);

      expect(result).toHaveProperty('id', 'session-1');
    });
  });

  describe('revoke', () => {
    it('should revoke a session', async () => {
      await repository.revoke('session-1');

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'REVOKED', revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllByUserId', () => {
    it('should revoke all active sessions for a user', async () => {
      await repository.revokeAllByUserId('user-1');

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: expect.any(Date) },
      });
    });
  });

  describe('findActiveByUserId', () => {
    it('should return active sessions', async () => {
      const sessions = [{ id: 'session-1', userId: 'user-1' }];
      mockPrisma.userSession.findMany.mockResolvedValue(sessions);

      const result = await repository.findActiveByUserId('user-1');

      expect(result).toEqual(sessions);
    });
  });
});
