import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { ReferralRepository } from './referral.repository';

describe('ReferralRepository', () => {
  let repository: ReferralRepository;

  const mockPrisma = {
    referral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    referralReward: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ReferralRepository>(ReferralRepository);
    jest.clearAllMocks();
  });

  describe('findByReferredUserId', () => {
    it('should look up a referral by the referred user', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({ id: 'referral-1' });

      const result = await repository.findByReferredUserId('user-2');
      expect(result).toHaveProperty('id', 'referral-1');
      expect(mockPrisma.referral.findUnique).toHaveBeenCalledWith({ where: { referredUserId: 'user-2' } });
    });
  });

  describe('markRewardIssued', () => {
    it('should flip rewardIssued and stamp completedAt', async () => {
      mockPrisma.referral.update.mockResolvedValue({ id: 'referral-1', rewardIssued: true });

      await repository.markRewardIssued('referral-1', 50);
      expect(mockPrisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral-1' },
        data: { rewardIssued: true, rewardAmount: 50, completedAt: expect.any(Date) },
      });
    });
  });

  describe('getStats', () => {
    it('should combine a count and an aggregate sum', async () => {
      mockPrisma.referral.count.mockResolvedValue(4);
      mockPrisma.referral.aggregate.mockResolvedValue({ _sum: { rewardAmount: 150 }, _count: 3 });

      const result = await repository.getStats('user-1');
      expect(result).toEqual({ totalReferred: 4, totalRewarded: 3, totalRewardEarned: 150 });
    });

    it('should default to zero when nothing has been rewarded yet', async () => {
      mockPrisma.referral.count.mockResolvedValue(0);
      mockPrisma.referral.aggregate.mockResolvedValue({ _sum: { rewardAmount: null }, _count: 0 });

      const result = await repository.getStats('user-1');
      expect(result.totalRewardEarned).toBe(0);
    });
  });
});
