import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a user by id with roles', async () => {
      const user = { id: 'user-1', email: 'test@example.com', userRoles: [] };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await repository.findById('user-1');

      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
      });
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      const result = await repository.findByEmail('test@example.com');

      expect(result).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('findByReferralCode', () => {
    it('should find a user by referral code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', referralCode: 'abc123' });

      const result = await repository.findByReferralCode('abc123');

      expect(result).toHaveProperty('referralCode', 'abc123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { referralCode: 'abc123' } });
    });
  });

  describe('create', () => {
    it('should create a user', async () => {
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', passwordHash: 'hash' };
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1', ...data });

      const result = await repository.create(data);

      expect(result).toHaveProperty('id', 'user-1');
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and status to DEACTIVATED', async () => {
      await repository.softDelete('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deletedAt: expect.any(Date), status: 'DEACTIVATED' },
      });
    });
  });

  describe('getRoleNames', () => {
    it('should uppercase role slugs so they match the SystemRole enum used by RolesGuard', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { role: { slug: 'admin' } },
        { role: { slug: 'merchant' } },
      ]);

      const result = await repository.getRoleNames('user-1');
      expect(result).toEqual(['ADMIN', 'MERCHANT']);
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed login attempts', async () => {
      await repository.incrementFailedAttempts('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginAttempts: { increment: 1 } },
      });
    });
  });

  describe('lockAccount', () => {
    it('should lock account until specified date', async () => {
      const until = new Date();
      await repository.lockAccount('user-1', until);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lockedUntil: until },
      });
    });
  });
});
