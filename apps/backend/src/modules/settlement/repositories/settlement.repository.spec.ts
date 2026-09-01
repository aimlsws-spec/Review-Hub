import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SettlementRepository } from './settlement.repository';

describe('SettlementRepository', () => {
  let repository: SettlementRepository;

  const mockPrisma = {
    settlement: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    merchantWallet: {
      findUnique: jest.fn(),
    },
    merchant: {
      findUniqueOrThrow: jest.fn(),
    },
  };

  const periodStart = new Date('2026-08-30T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T00:00:00.000Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettlementRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<SettlementRepository>(SettlementRepository);
    jest.clearAllMocks();
  });

  describe('findMerchantIdsActiveInPeriod', () => {
    it('should return the distinct merchant ids behind active wallets in the period', async () => {
      mockPrisma.walletTransaction.findMany.mockResolvedValue([
        { merchantWallet: { merchantId: 'merchant-1' } },
        { merchantWallet: { merchantId: 'merchant-2' } },
      ]);

      const result = await repository.findMerchantIdsActiveInPeriod(periodStart, periodEnd);

      expect(result).toEqual(['merchant-1', 'merchant-2']);
      expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith({
        where: { merchantWalletId: { not: null }, createdAt: { gte: periodStart, lt: periodEnd } },
        distinct: ['merchantWalletId'],
        select: { merchantWallet: { select: { merchantId: true } } },
      });
    });
  });

  describe('generateForMerchant', () => {
    it('should return the existing settlement without recomputing anything, when one already exists', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settlement-1' });

      const result = await repository.generateForMerchant({ merchantId: 'merchant-1', periodStart, periodEnd });

      expect(result).toEqual({ id: 'settlement-1' });
      expect(mockPrisma.merchantWallet.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.settlement.create).not.toHaveBeenCalled();
    });

    it('should return null when the merchant has no wallet yet', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      mockPrisma.merchantWallet.findUnique.mockResolvedValue(null);

      const result = await repository.generateForMerchant({ merchantId: 'merchant-1', periodStart, periodEnd });

      expect(result).toBeNull();
      expect(mockPrisma.settlement.create).not.toHaveBeenCalled();
    });

    it('should aggregate top-ups and spend for the period and compute commission at the merchant rate', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      mockPrisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1', merchantId: 'merchant-1' });
      mockPrisma.merchant.findUniqueOrThrow.mockResolvedValue({ id: 'merchant-1', commissionRate: 0.1 });
      mockPrisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } })
        .mockResolvedValueOnce({ _sum: { amount: 2000 } });
      mockPrisma.settlement.create.mockResolvedValue({ id: 'settlement-1' });

      const result = await repository.generateForMerchant({ merchantId: 'merchant-1', periodStart, periodEnd });

      expect(result).toEqual({ id: 'settlement-1' });
      expect(mockPrisma.settlement.create).toHaveBeenCalledWith({
        data: {
          merchant: { connect: { id: 'merchant-1' } },
          periodStart,
          periodEnd,
          totalToppedUp: 5000,
          totalSpent: 2000,
          commissionRate: 0.1,
          commissionAmount: 200,
        },
      });
    });

    it('should default sums to zero when there was no matching activity', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      mockPrisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1', merchantId: 'merchant-1' });
      mockPrisma.merchant.findUniqueOrThrow.mockResolvedValue({ id: 'merchant-1', commissionRate: 0.1 });
      mockPrisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockPrisma.settlement.create.mockResolvedValue({ id: 'settlement-1' });

      await repository.generateForMerchant({ merchantId: 'merchant-1', periodStart, periodEnd });

      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalToppedUp: 0, totalSpent: 0, commissionAmount: 0 }) }),
      );
    });
  });

  describe('findByMerchant', () => {
    it('should return paginated settlements for a merchant', async () => {
      mockPrisma.settlement.findMany.mockResolvedValue([{ id: 'settlement-1' }]);
      mockPrisma.settlement.count.mockResolvedValue(1);

      const result = await repository.findByMerchant('merchant-1', 1, 20);

      expect(result).toEqual({ data: [{ id: 'settlement-1' }], total: 1, page: 1, limit: 20 });
    });
  });
});
