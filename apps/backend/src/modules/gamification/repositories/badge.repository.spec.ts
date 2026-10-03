import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { BadgeRepository } from './badge.repository';

describe('BadgeRepository', () => {
  let repository: BadgeRepository;

  const mockPrisma = {
    badge: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    userBadge: { findMany: jest.fn(), create: jest.fn() },
    referral: { count: jest.fn() },
    fraudFlag: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BadgeRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BadgeRepository>(BadgeRepository);
    jest.clearAllMocks();
  });

  describe('findActiveUnearnedForUser', () => {
    it('should query active, non-deleted badges excluding ones already earned by the user', async () => {
      mockPrisma.badge.findMany.mockResolvedValue([]);

      await repository.findActiveUnearnedForUser('user-1');

      expect(mockPrisma.badge.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, isActive: true, userBadges: { none: { userId: 'user-1' } } },
      });
    });
  });

  describe('award', () => {
    it('should create a UserBadge row linking the user and badge', async () => {
      mockPrisma.userBadge.create.mockResolvedValue({ id: 'user-badge-1' });

      await repository.award('user-1', 'badge-1');

      expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'user-1' } }, badge: { connect: { id: 'badge-1' } } },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      mockPrisma.badge.update.mockResolvedValue({ id: 'badge-1', deletedAt: new Date() });

      await repository.softDelete('badge-1');

      expect(mockPrisma.badge.update).toHaveBeenCalledWith({
        where: { id: 'badge-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('achievement queries', () => {
    it('counts only referrals whose reward was paid', async () => {
      await repository.countPaidReferrals('user-1');

      expect(mockPrisma.referral.count).toHaveBeenCalledWith({ where: { referrerId: 'user-1', rewardIssued: true, deletedAt: null } });
    });

    it('finds who already holds a badge, and who has an open fraud flag', async () => {
      mockPrisma.userBadge.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.fraudFlag.findMany.mockResolvedValue([{ userId: 'u2' }]);

      await expect(repository.holdersAmong('b-1', ['u1', 'u2'])).resolves.toEqual(new Set(['u1']));
      await expect(repository.withOpenFraudFlags(['u1', 'u2'])).resolves.toEqual(new Set(['u2']));
      expect(mockPrisma.fraudFlag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: { in: ['u1', 'u2'] }, resolved: false } }));
    });

    it('asks nothing for an empty list', async () => {
      await expect(repository.holdersAmong('b-1', [])).resolves.toEqual(new Set());
      await expect(repository.withOpenFraudFlags([])).resolves.toEqual(new Set());
      expect(mockPrisma.userBadge.findMany).not.toHaveBeenCalled();
    });
  });
});
