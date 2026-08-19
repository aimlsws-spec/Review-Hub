import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserBankAccountRepository } from './user-bank-account.repository';

describe('UserBankAccountRepository', () => {
  let repository: UserBankAccountRepository;

  const mockPrisma = {
    userBankAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBankAccountRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserBankAccountRepository>(UserBankAccountRepository);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should order primary accounts first', async () => {
      mockPrisma.userBankAccount.findMany.mockResolvedValue([{ id: 'bank-1' }]);

      const result = await repository.findByUserId('user-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.userBankAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('unsetPrimaryForUser', () => {
    it('should exclude the given id when provided', async () => {
      mockPrisma.userBankAccount.updateMany.mockResolvedValue({ count: 1 });

      await repository.unsetPrimaryForUser('user-1', 'bank-2');
      expect(mockPrisma.userBankAccount.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true, deletedAt: null, id: { not: 'bank-2' } },
        data: { isPrimary: false },
      });
    });
  });
});
