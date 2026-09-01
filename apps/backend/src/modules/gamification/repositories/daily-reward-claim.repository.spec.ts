import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { DailyRewardClaimRepository } from './daily-reward-claim.repository';

describe('DailyRewardClaimRepository', () => {
  let repository: DailyRewardClaimRepository;

  const mockPrisma = {
    dailyRewardClaim: { findUnique: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyRewardClaimRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<DailyRewardClaimRepository>(DailyRewardClaimRepository);
    jest.clearAllMocks();
  });

  describe('findForUserToday', () => {
    it('should look up a claim keyed on today\'s UTC calendar date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-31T15:42:00.000Z'));
      mockPrisma.dailyRewardClaim.findUnique.mockResolvedValue(null);

      await repository.findForUserToday('user-1');

      expect(mockPrisma.dailyRewardClaim.findUnique).toHaveBeenCalledWith({
        where: { userId_claimDate: { userId: 'user-1', claimDate: new Date('2026-08-31T00:00:00.000Z') } },
      });
      jest.useRealTimers();
    });
  });

  describe('create', () => {
    it('should record the claim with today\'s date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-31T15:42:00.000Z'));
      mockPrisma.dailyRewardClaim.create.mockResolvedValue({ id: 'claim-1' });

      await repository.create({ userId: 'user-1', prizeId: 'prize-1', rewardAmount: 20 });

      expect(mockPrisma.dailyRewardClaim.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: 'user-1' } },
          prize: { connect: { id: 'prize-1' } },
          claimDate: new Date('2026-08-31T00:00:00.000Z'),
          rewardAmount: 20,
        },
      });
      jest.useRealTimers();
    });
  });
});
