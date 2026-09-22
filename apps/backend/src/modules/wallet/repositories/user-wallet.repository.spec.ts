import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserWalletRepository } from './user-wallet.repository';

describe('UserWalletRepository', () => {
  let repository: UserWalletRepository;

  const mockTx = {
    // The row lock (SELECT ... FOR UPDATE) every balance change takes first.
    $queryRaw: jest.fn(),
    userWallet: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
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

  describe('findTransactions', () => {
    beforeEach(() => {
      mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
      mockPrisma.walletTransaction.count.mockResolvedValue(0);
    });

    it('lists one wallet’s transactions, newest first, a page at a time, when there is no filter', async () => {
      await repository.findTransactions('wallet-1', 3, 20);

      expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith({ where: { walletId: 'wallet-1' }, skip: 40, take: 20, orderBy: { createdAt: 'desc' } });
      expect(mockPrisma.walletTransaction.count).toHaveBeenCalledWith({ where: { walletId: 'wallet-1' } });
    });

    it('applies the filter to the page and to the count, so the total matches what can be paged through', async () => {
      const from = new Date('2026-08-31T18:30:00Z');

      await repository.findTransactions('wallet-1', 1, 20, { type: 'BONUS', search: 'diwali', createdFrom: from });

      const where = { walletId: 'wallet-1', type: 'BONUS', remarks: { contains: 'diwali' }, createdAt: { gte: from } };
      expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
      expect(mockPrisma.walletTransaction.count).toHaveBeenCalledWith({ where });
    });
  });

  describe('findForExport', () => {
    it('reads one more than the limit, so a history that was cut can be told from one that fit', async () => {
      mockPrisma.walletTransaction.findMany.mockResolvedValue([]);

      await repository.findForExport('wallet-1', { type: 'CREDIT' }, 5000);

      expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith({ where: { walletId: 'wallet-1', type: 'CREDIT' }, orderBy: { createdAt: 'desc' }, take: 5001 });
    });
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

  describe('debitForRedemption', () => {
    it('should decrement availableBalance and write a DEBIT transaction', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'DEBIT' });

      await repository.debitForRedemption({
        walletId: 'wallet-1', amount: 100, referenceType: 'MarketplaceItem', referenceId: 'item-1', remarks: 'Redeemed: x',
      });

      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 400 },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEBIT', status: 'SUCCESS', amount: 100, balanceBefore: 500, balanceAfter: 400,
          referenceType: 'MarketplaceItem', referenceId: 'item-1',
        }),
      });
    });

    it('should reject debiting more than the available balance', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 50 });

      await expect(
        repository.debitForRedemption({ walletId: 'wallet-1', amount: 100, referenceType: 'MarketplaceItem', referenceId: 'item-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.userWallet.update).not.toHaveBeenCalled();
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

  describe('clawbackReward', () => {
    it('should recover the full amount when the balance covers it, with no shortfall', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'CLAWBACK' });

      const result = await repository.clawbackReward({ walletId: 'wallet-1', amount: 100, referenceId: 'reward-1' });

      expect(result.recoverable).toBe(100);
      expect(result.shortfall).toBe(0);
      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 400 },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'CLAWBACK', amount: 100, referenceType: 'Reward', referenceId: 'reward-1' }),
      });
    });

    it('should recover only what is available and report the shortfall, never going negative', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 30 });

      const result = await repository.clawbackReward({ walletId: 'wallet-1', amount: 100, referenceId: 'reward-1' });

      expect(result.recoverable).toBe(30);
      expect(result.shortfall).toBe(70);
      expect(mockTx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 0 },
      });
    });

    it('should recover nothing and report the full amount as shortfall when the balance is 0', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 0 });

      const result = await repository.clawbackReward({ walletId: 'wallet-1', amount: 100, referenceId: 'reward-1' });

      expect(result.recoverable).toBe(0);
      expect(result.shortfall).toBe(100);
    });
  });

  describe('row locking, so concurrent requests can not both spend the same balance', () => {
    const lockedSql = () => mockTx.$queryRaw.mock.calls.map(([strings]: [TemplateStringsArray]) => strings.join('?'));
    const wallet = { id: 'wallet-1', availableBalance: 5000, lockedBalance: 0 };

    beforeEach(() => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue(wallet);
      mockTx.userWallet.update.mockResolvedValue(wallet);
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'tx-1' });
    });

    it.each([
      ['creditAvailable', () => repository.creditAvailable({ walletId: 'wallet-1', amount: 50, type: 'CREDIT' })],
      ['holdForWithdrawal', () => repository.holdForWithdrawal({ walletId: 'wallet-1', amount: 100, withdrawalId: 'w-1' })],
      ['releaseHold', () => repository.releaseHold({ walletId: 'wallet-1', amount: 100, withdrawalId: 'w-1' })],
      ['clawbackReward', () => repository.clawbackReward({ walletId: 'wallet-1', amount: 50, referenceId: 'r-1' })],
    ])('%s locks the wallet row before it reads the balance', async (_name, run) => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ ...wallet, lockedBalance: 1000 });

      await run();

      expect(lockedSql()[0]).toBe('SELECT id FROM user_wallets WHERE id = ? FOR UPDATE');
      const lockOrder = mockTx.$queryRaw.mock.invocationCallOrder[0];
      const readOrder = mockTx.userWallet.findUniqueOrThrow.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(readOrder);
    });

    it('locks the wallet being changed, not another one', async () => {
      await repository.creditAvailable({ walletId: 'wallet-42', amount: 50, type: 'CREDIT' });

      expect(mockTx.$queryRaw.mock.calls[0][1]).toBe('wallet-42');
    });

    it('still refuses a withdrawal the balance can not cover, after taking the lock', async () => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue({ ...wallet, availableBalance: 500 });

      await expect(repository.holdForWithdrawal({ walletId: 'wallet-1', amount: 2000, withdrawalId: 'w-1' })).rejects.toThrow(BadRequestException);

      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockTx.userWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreate when two requests race to create the wallet', () => {
    const duplicate = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

    it('returns the wallet the other request created, instead of failing', async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'wallet-winner' });
      mockPrisma.userWallet.create.mockRejectedValue(duplicate());

      await expect(repository.getOrCreate('user-1')).resolves.toEqual({ id: 'wallet-winner' });
    });

    it('still fails for any other database error', async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);
      mockPrisma.userWallet.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.getOrCreate('user-1')).rejects.toThrow('connection lost');
    });

    it('fails if the constraint was hit but no wallet can be found afterwards', async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);
      mockPrisma.userWallet.create.mockRejectedValue(duplicate());

      await expect(repository.getOrCreate('user-1')).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('creditAvailable with idempotent: true', () => {
    const wallet = { id: 'wallet-1', availableBalance: 100, lockedBalance: 0 };
    const ref = { walletId: 'wallet-1', amount: 50, type: 'CREDIT' as const, referenceType: 'Reward', referenceId: 'reward-1' };

    beforeEach(() => {
      mockTx.userWallet.findUniqueOrThrow.mockResolvedValue(wallet);
      mockTx.userWallet.update.mockResolvedValue({ ...wallet, availableBalance: 150 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'new-tx' });
    });

    it('does not credit again when the same reference is already in the ledger', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue({ id: 'old-tx' });

      const result = await repository.creditAvailable({ ...ref, idempotent: true });

      expect(result).toMatchObject({ transaction: { id: 'old-tx' }, alreadyApplied: true });
      expect(mockTx.userWallet.update).not.toHaveBeenCalled();
      expect(mockTx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('looks for the reference under the wallet lock, and only for a successful credit of that type', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue({ id: 'old-tx' });

      await repository.creditAvailable({ ...ref, idempotent: true });

      expect(mockTx.walletTransaction.findFirst).toHaveBeenCalledWith({
        where: { walletId: 'wallet-1', type: 'CREDIT', referenceType: 'Reward', referenceId: 'reward-1', status: 'SUCCESS' },
      });
      expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockTx.walletTransaction.findFirst.mock.invocationCallOrder[0]);
    });

    it('credits normally when the reference is not in the ledger yet', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue(null);

      const result = await repository.creditAvailable({ ...ref, idempotent: true });

      expect(result.alreadyApplied).toBe(false);
      expect(mockTx.userWallet.update).toHaveBeenCalledTimes(1);
      expect(mockTx.walletTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('is off by default: callers that reuse a reference for several real credits are not affected', async () => {
      await repository.creditAvailable(ref);

      expect(mockTx.walletTransaction.findFirst).not.toHaveBeenCalled();
      expect(mockTx.userWallet.update).toHaveBeenCalledTimes(1);
    });

    it('does not look anything up when there is no reference to look up', async () => {
      await repository.creditAvailable({ walletId: 'wallet-1', amount: 50, type: 'CREDIT', idempotent: true });

      expect(mockTx.walletTransaction.findFirst).not.toHaveBeenCalled();
      expect(mockTx.userWallet.update).toHaveBeenCalledTimes(1);
    });
  });
});
