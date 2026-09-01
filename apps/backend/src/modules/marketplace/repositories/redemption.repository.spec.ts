import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { RedemptionRepository } from './redemption.repository';

describe('RedemptionRepository', () => {
  let repository: RedemptionRepository;

  const mockPrisma = {
    redemption: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedemptionRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<RedemptionRepository>(RedemptionRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a redemption row linking the user and item', async () => {
      mockPrisma.redemption.create.mockResolvedValue({ id: 'redemption-1' });

      await repository.create({ userId: 'user-1', itemId: 'item-1', costAmount: 100, redemptionCode: 'ABC123' });

      expect(mockPrisma.redemption.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: 'user-1' } },
          item: { connect: { id: 'item-1' } },
          costAmount: 100,
          redemptionCode: 'ABC123',
        },
        include: { item: true },
      });
    });
  });

  describe('findByUser', () => {
    it('should return paginated redemptions for the user', async () => {
      mockPrisma.redemption.findMany.mockResolvedValue([{ id: 'redemption-1' }]);
      mockPrisma.redemption.count.mockResolvedValue(1);

      const result = await repository.findByUser('user-1', 1, 20);
      expect(result).toEqual({ data: [{ id: 'redemption-1' }], total: 1, page: 1, limit: 20 });
    });
  });
});
