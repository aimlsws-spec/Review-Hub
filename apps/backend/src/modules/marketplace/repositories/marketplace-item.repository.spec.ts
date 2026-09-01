import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MarketplaceItemRepository } from './marketplace-item.repository';

describe('MarketplaceItemRepository', () => {
  let repository: MarketplaceItemRepository;

  const mockTx = {
    marketplaceItem: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  const mockPrisma = {
    marketplaceItem: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceItemRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<MarketplaceItemRepository>(MarketplaceItemRepository);
    jest.clearAllMocks();
  });

  describe('decrementStockIfTracked', () => {
    it('should decrement stock and return true when stock is tracked', async () => {
      mockTx.marketplaceItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', stock: 3 });

      const result = await repository.decrementStockIfTracked('item-1');

      expect(result).toBe(true);
      expect(mockTx.marketplaceItem.update).toHaveBeenCalledWith({ where: { id: 'item-1' }, data: { stock: { decrement: 1 } } });
    });

    it('should return false without touching anything for unlimited-stock items', async () => {
      mockTx.marketplaceItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', stock: null });

      const result = await repository.decrementStockIfTracked('item-1');

      expect(result).toBe(false);
      expect(mockTx.marketplaceItem.update).not.toHaveBeenCalled();
    });

    it('should reject when stock has hit zero', async () => {
      mockTx.marketplaceItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', stock: 0 });

      await expect(repository.decrementStockIfTracked('item-1')).rejects.toThrow(BadRequestException);
      expect(mockTx.marketplaceItem.update).not.toHaveBeenCalled();
    });
  });

  describe('incrementStock', () => {
    it('should increment stock', async () => {
      mockPrisma.marketplaceItem.update.mockResolvedValue({ id: 'item-1', stock: 4 });

      await repository.incrementStock('item-1');

      expect(mockPrisma.marketplaceItem.update).toHaveBeenCalledWith({ where: { id: 'item-1' }, data: { stock: { increment: 1 } } });
    });
  });
});
