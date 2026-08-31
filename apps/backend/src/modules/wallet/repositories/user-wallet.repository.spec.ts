import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserWalletRepository } from './user-wallet.repository';

describe('UserWalletRepository', () => {
  let repository: UserWalletRepository;

  const mockTx = {
    userWallet: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    userWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserWalletRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserWalletRepository>(UserWalletRepository);
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return the existing wallet without creating one', async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValue({ id: 'wallet-1' });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ id: 'wallet-1' });
      expect(mockPrisma.userWallet.create).not.toHaveBeenCalled();
    });

    it('should create a wallet when none exists', async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);
      mockPrisma.userWallet.create.mockResolvedValue({ id: 'wallet-new' });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ id: 'wallet-new' });
      expect(mockPrisma.userWallet.create).toHaveBeenCalledWith({ data: { user: { connect: { id: 'user-1' } } } });
    });
  });

  describe('creditAvailable', () => {
    it('should increment availableBalance and lifetimeEarnings, and write a SUCCESS transaction', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 100 });
      mockTx.userWallet.update.mockResolvedValue({ id: 'wallet-1', availableBalance: 150 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', amount: 50 });

      const result = await repository.creditAvailable({
        walletId: 'wallet-1',
        amount: 50,
        type: 'CREDIT',
        referenceType: 'Reward',
        referenceId: 'reward-1',
      });

      expect(result.transaction).toEqual({ id: 'txn-1', amount: 50 });
      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 150, lifetimeEarnings: { increment: 50 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'CREDIT', status: 'SUCCESS', balanceBefore: 100, balanceAfter: 150 }),
      });
    });
  });

  describe('holdForWithdrawal', () => {
    it('should move funds from available to locked', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 2000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'HOLD' });

      await repository.holdForWithdrawal({ walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1' });

      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 500, lockedBalance: { increment: 1500 } },
      });
    });

    it('should reject holding more than the available balance', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });

      await expect(
        repository.holdForWithdrawal({ walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.userWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('releaseHold', () => {
    it('should move funds back from locked to available', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'RELEASE' });

      await repository.releaseHold({ walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1' });

      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 2000, lockedBalance: { decrement: 1500 } },
      });
    });
  });

  describe('reverseFinalizedWithdrawal', () => {
    it('should credit availableBalance back and decrement totalWithdrawn', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'REFUND' });

      await repository.reverseFinalizedWithdrawal({ walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1' });

      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 2000, totalWithdrawn: { decrement: 1500 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'REFUND',
          status: 'SUCCESS',
          amount: 1500,
          balanceBefore: 500,
          balanceAfter: 2000,
          referenceType: 'WithdrawalRequest',
          referenceId: 'withdrawal-1',
        }),
      });
    });
  });

  describe('finalizeWithdrawal', () => {
    it('should clear the locked amount and increment totalWithdrawn', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', lockedBalance: 1500 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'WITHDRAWAL' });

      await repository.finalizeWithdrawal({ walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1' });

      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { lockedBalance: 0, totalWithdrawn: { increment: 1500 } },
      });
    });
  });
});
