import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { DailyRewardPrizeRepository } from './daily-reward-prize.repository';

describe('DailyRewardPrizeRepository', () => {
  let repository: DailyRewardPrizeRepository;

  const mockPrisma = {
    dailyRewardPrize: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyRewardPrizeRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<DailyRewardPrizeRepository>(DailyRewardPrizeRepository);
    jest.clearAllMocks();
  });

  describe('findAllActive', () => {
    it('should query only active, non-deleted prizes', async () => {
      mockPrisma.dailyRewardPrize.findMany.mockResolvedValue([]);

      await repository.findAllActive();

      expect(mockPrisma.dailyRewardPrize.findMany).toHaveBeenCalledWith({ where: { deletedAt: null, isActive: true } });
    });
  });

  describe('findAll', () => {
    it('should return paginated prizes', async () => {
      mockPrisma.dailyRewardPrize.findMany.mockResolvedValue([{ id: 'prize-1' }]);
      mockPrisma.dailyRewardPrize.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 20 });
      expect(result).toEqual({ data: [{ id: 'prize-1' }], total: 1, page: 1, limit: 20 });
    });
  });
});
