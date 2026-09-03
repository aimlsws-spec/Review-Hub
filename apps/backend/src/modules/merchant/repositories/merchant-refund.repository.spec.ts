import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantRefundRepository } from './merchant-refund.repository';

describe('MerchantRefundRepository', () => {
  let repository: MerchantRefundRepository;

  const mockPrisma = {
    merchantRefundRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    merchantRefundLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRefundRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MerchantRefundRepository>(MerchantRefundRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should include the merchant wallet, bank account, and logs', async () => {
      mockPrisma.merchantRefundRequest.findFirst.mockResolvedValue({ id: 'refund-1' });

      const result = await repository.findById('refund-1');
      expect(result).toHaveProperty('id', 'refund-1');
      expect(mockPrisma.merchantRefundRequest.findFirst).toHaveBeenCalledWith({
        where: { id: 'refund-1', deletedAt: null },
        include: { merchantWallet: true, bankAccount: true, logs: true },
      });
    });
  });

  describe('findPendingForAdmin', () => {
    it('should only return PENDING/UNDER_REVIEW, non-deleted requests, oldest first', async () => {
      mockPrisma.merchantRefundRequest.findMany.mockResolvedValue([{ id: 'refund-1' }]);
      mockPrisma.merchantRefundRequest.count.mockResolvedValue(1);

      const result = await repository.findPendingForAdmin({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.merchantRefundRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] }, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('findByMerchantWalletId', () => {
    it('should scope to the wallet, non-deleted requests, newest first', async () => {
      mockPrisma.merchantRefundRequest.findMany.mockResolvedValue([{ id: 'refund-1' }]);
      mockPrisma.merchantRefundRequest.count.mockResolvedValue(1);

      const result = await repository.findByMerchantWalletId({ merchantWalletId: 'wallet-1', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.merchantRefundRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantWalletId: 'wallet-1', deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('createLog', () => {
    it('should create a refund log entry', async () => {
      mockPrisma.merchantRefundLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await repository.createLog({} as never);
      expect(result).toHaveProperty('id', 'log-1');
    });
  });
});
