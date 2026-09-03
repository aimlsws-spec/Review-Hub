import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { RewardRepository } from './reward.repository';

describe('RewardRepository', () => {
  let repository: RewardRepository;

  const mockPrisma = {
    reward: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<RewardRepository>(RewardRepository);
    jest.clearAllMocks();
  });

  describe('findBySubmissionId', () => {
    it('should look up a reward by its unique submission id', async () => {
      mockPrisma.reward.findUnique.mockResolvedValue({ id: 'reward-1', submissionId: 'submission-1' });

      const result = await repository.findBySubmissionId('submission-1');
      expect(result).toHaveProperty('id', 'reward-1');
      expect(mockPrisma.reward.findUnique).toHaveBeenCalledWith({ where: { submissionId: 'submission-1' } });
    });
  });

  describe('markCredited', () => {
    it('should set status to CREDITED with a timestamp', async () => {
      mockPrisma.reward.update.mockResolvedValue({ id: 'reward-1', status: 'CREDITED' });

      await repository.markCredited('reward-1');
      expect(mockPrisma.reward.update).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
        data: { status: 'CREDITED', creditedAt: expect.any(Date) },
      });
    });
  });

  describe('markReversed', () => {
    it('should set status to REVERSED with the reversal details and a timestamp', async () => {
      mockPrisma.reward.update.mockResolvedValue({ id: 'reward-1', status: 'REVERSED' });

      await repository.markReversed('reward-1', {
        reversedAmount: 60,
        shortfallAmount: 40,
        reversalReason: 'Confirmed fraud',
        reversedBy: 'admin-1',
      });

      expect(mockPrisma.reward.update).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
        data: {
          status: 'REVERSED',
          reversedAmount: 60,
          shortfallAmount: 40,
          reversalReason: 'Confirmed fraud',
          reversedBy: 'admin-1',
          reversedAt: expect.any(Date),
        },
      });
    });
  });

  describe('countCreditedByUser', () => {
    it('should count only CREDITED rewards for a user', async () => {
      mockPrisma.reward.count.mockResolvedValue(3);

      const result = await repository.countCreditedByUser('user-1');
      expect(result).toBe(3);
      expect(mockPrisma.reward.count).toHaveBeenCalledWith({ where: { userId: 'user-1', status: 'CREDITED' } });
    });
  });

  describe('findByUser', () => {
    it('should return paginated rewards for a user', async () => {
      mockPrisma.reward.findMany.mockResolvedValue([{ id: 'reward-1' }]);
      mockPrisma.reward.count.mockResolvedValue(1);

      const result = await repository.findByUser({ userId: 'user-1', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByMerchant', () => {
    it('should scope rewards to campaigns owned by the merchant', async () => {
      mockPrisma.reward.findMany.mockResolvedValue([{ id: 'reward-1' }]);
      mockPrisma.reward.count.mockResolvedValue(1);

      const result = await repository.findByMerchant({ merchantId: 'merchant-1', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.reward.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaign: { merchantId: 'merchant-1' }, deletedAt: null },
        }),
      );
    });
  });
});
