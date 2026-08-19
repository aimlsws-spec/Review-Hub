import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { WithdrawalRepository } from './withdrawal.repository';

describe('WithdrawalRepository', () => {
  let repository: WithdrawalRepository;

  const mockPrisma = {
    withdrawalRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    withdrawalLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<WithdrawalRepository>(WithdrawalRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should include wallet, bank account, and logs', async () => {
      mockPrisma.withdrawalRequest.findFirst.mockResolvedValue({ id: 'withdrawal-1' });

      const result = await repository.findById('withdrawal-1');
      expect(result).toHaveProperty('id', 'withdrawal-1');
      expect(mockPrisma.withdrawalRequest.findFirst).toHaveBeenCalledWith({
        where: { id: 'withdrawal-1', deletedAt: null },
        include: { wallet: true, bankAccount: true, logs: true },
      });
    });
  });

  describe('findPendingForAdmin', () => {
    it('should only return PENDING/UNDER_REVIEW, non-deleted requests, oldest first', async () => {
      mockPrisma.withdrawalRequest.findMany.mockResolvedValue([{ id: 'withdrawal-1' }]);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(1);

      const result = await repository.findPendingForAdmin({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.withdrawalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] }, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('createLog', () => {
    it('should create a withdrawal log entry', async () => {
      mockPrisma.withdrawalLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await repository.createLog({} as never);
      expect(result).toHaveProperty('id', 'log-1');
    });
  });
});
