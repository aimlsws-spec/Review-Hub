import { Prisma } from '@prisma/client';

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { ManualTopUpRepository } from './manual-top-up.repository';

describe('ManualTopUpRepository', () => {
  const tx = {
    $queryRaw: jest.fn(),
    merchantWallet: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    merchantManualTopUp: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn() },
  };
  const prisma = {
    transaction: jest.fn(),
    merchantWallet: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
    merchantManualTopUp: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
  let repository: ManualTopUpRepository;

  const topUp = (overrides: Record<string, unknown> = {}) => ({
    id: 'top-1',
    merchantWalletId: 'wallet-1',
    status: 'PENDING_APPROVAL',
    amount: '250000.00',
    bankReference: 'UTR123456789',
    receivedOn: new Date('2026-09-20'),
    recordedBy: 'admin-1',
    ...overrides,
  });
  const record = { merchantId: 'm-1', amount: 5000, bankReference: 'UTR123456789', receivedOn: new Date('2026-09-20'), recordedBy: 'admin-1', needsApproval: false };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.transaction.mockImplementation((fn: (client: unknown) => unknown) => fn(tx));
    prisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1' });
    tx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: '1000.00' });
    tx.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });
    tx.merchantManualTopUp.create.mockImplementation(async ({ data }: { data: { status: string } }) => ({ id: 'top-1', status: data.status }));
    tx.merchantManualTopUp.update.mockImplementation(async ({ data }: { data: object }) => ({ id: 'top-1', ...data, merchantWallet: { merchantId: 'm-1' } }));
    tx.$queryRaw.mockResolvedValueOnce([{ merchantWalletId: 'wallet-1' }]).mockResolvedValue([]);
    repository = new ManualTopUpRepository(prisma as never);
  });

  describe('recording', () => {
    it('credits a small top-up in the same step: the balance, the ledger and the record', async () => {
      const result = await repository.record(record);

      expect(tx.merchantWallet.update).toHaveBeenCalledWith({ where: { id: 'wallet-1' }, data: { availableBalance: 6000, totalTopUp: { increment: 5000 } } });
      expect(tx.walletTransaction.create.mock.calls[0][0].data).toMatchObject({ type: 'CREDIT', status: 'SUCCESS', amount: 5000, balanceBefore: 1000, balanceAfter: 6000, referenceId: 'UTR123456789' });
      expect(result.move).toEqual({ balanceBefore: 1000, balanceAfter: 6000 });
      expect(tx.merchantManualTopUp.create.mock.calls[0][0].data.status).toBe('COMPLETED');
    });

    it('only records a large one: it claims the reference and credits nothing', async () => {
      const result = await repository.record({ ...record, amount: 250000, needsApproval: true });

      expect(tx.merchantManualTopUp.create.mock.calls[0][0].data).toMatchObject({ status: 'PENDING_APPROVAL', bankReference: 'UTR123456789' });
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
      expect(tx.walletTransaction.create).not.toHaveBeenCalled();
      expect(result.move).toBeNull();
    });

    it('creates the wallet for a first top-up, and uses the wallet another request made first if it loses the race', async () => {
      prisma.merchantWallet.findUnique.mockResolvedValue(null);
      prisma.merchantWallet.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test' }));
      prisma.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1' });

      await expect(repository.record(record)).resolves.toBeDefined();

      expect(prisma.merchantWallet.findUniqueOrThrow).toHaveBeenCalledWith({ where: { merchantId: 'm-1' }, select: { id: true } });
    });

    it('reports a reference that was already used as a conflict', async () => {
      tx.merchantManualTopUp.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test' }));

      await expect(repository.record(record)).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not turn other errors into a conflict', async () => {
      tx.merchantManualTopUp.create.mockRejectedValue(new Error('database down'));
      await expect(repository.record(record)).rejects.toThrow('database down');
    });
  });

  describe('approving', () => {
    beforeEach(() => tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp()));

    it('takes the top-up and wallet locks before reading anything', async () => {
      await repository.approve({ topUpId: 'top-1', adminId: 'admin-2' });

      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.merchantManualTopUp.findUnique.mock.invocationCallOrder[0]);
    });

    it('credits the amount and marks it completed, by a different admin, in one step', async () => {
      const result = await repository.approve({ topUpId: 'top-1', adminId: 'admin-2' });

      expect(tx.merchantWallet.update).toHaveBeenCalledWith({ where: { id: 'wallet-1' }, data: { availableBalance: 251000, totalTopUp: { increment: 250000 } } });
      expect(tx.merchantManualTopUp.update.mock.calls[0][0].data).toMatchObject({ status: 'COMPLETED', decidedBy: 'admin-2' });
      expect(result.move).toEqual({ balanceBefore: 1000, balanceAfter: 251000 });
    });

    it('refuses the admin who recorded it: the second admin has to be someone else', async () => {
      await expect(repository.approve({ topUpId: 'top-1', adminId: 'admin-1' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
    });

    it.each(['COMPLETED', 'REJECTED', 'REVERSED'])('refuses a top-up that is already %s', async (status) => {
      tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp({ status }));

      await expect(repository.approve({ topUpId: 'top-1', adminId: 'admin-2' })).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
    });

    it('says not found for a top-up that does not exist', async () => {
      tx.merchantManualTopUp.findUnique.mockResolvedValue(null);
      await expect(repository.approve({ topUpId: 'nope', adminId: 'admin-2' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rejecting', () => {
    beforeEach(() => tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp()));

    it('gives the bank reference back, keeps it in the record, and moves no money', async () => {
      await repository.reject({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Does not match the statement' });

      expect(tx.merchantManualTopUp.update.mock.calls[0][0].data).toMatchObject({
        status: 'REJECTED',
        decidedBy: 'admin-2',
        rejectionReason: 'Does not match the statement',
        rejectedReference: 'UTR123456789',
        bankReference: null,
      });
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
    });

    it('refuses the admin who recorded it, and one that is not waiting', async () => {
      await expect(repository.reject({ topUpId: 'top-1', adminId: 'admin-1', reason: 'Not right' })).rejects.toBeInstanceOf(ForbiddenException);

      tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp({ status: 'COMPLETED' }));
      await expect(repository.reject({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Not right' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('reversing', () => {
    beforeEach(() => tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp({ status: 'COMPLETED', amount: '5000.00' })));

    it('takes the money back out with a new opposite entry, and links the two', async () => {
      tx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: '8000.00' });

      const result = await repository.reverse({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Typed the wrong amount' });

      expect(tx.merchantWallet.update).toHaveBeenCalledWith({ where: { id: 'wallet-1' }, data: { availableBalance: 3000, totalTopUp: { decrement: 5000 } } });
      expect(tx.walletTransaction.create.mock.calls[0][0].data).toMatchObject({ type: 'DEBIT', status: 'SUCCESS', amount: 5000, balanceBefore: 8000, balanceAfter: 3000, referenceType: 'ManualTopUpReversal', referenceId: 'top-1' });
      expect(tx.merchantManualTopUp.update.mock.calls[0][0].data).toMatchObject({ status: 'REVERSED', reversedBy: 'admin-2', reversalReason: 'Typed the wrong amount' });
      expect(result.move).toEqual({ balanceBefore: 8000, balanceAfter: 3000 });
    });

    it('can take back exactly what is left, leaving nothing', async () => {
      tx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: '5000.00' });

      const result = await repository.reverse({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Wrong merchant' });

      expect(result.move.balanceAfter).toBe(0);
    });

    it('refuses when the merchant has already used some of it, and says how much is left', async () => {
      tx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: '1200.50' });

      await expect(repository.reverse({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Wrong merchant' })).rejects.toThrow(/Only ₹1200\.50 of this ₹5000\.00 is still available/);
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
      expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it.each(['PENDING_APPROVAL', 'REJECTED', 'REVERSED'])('refuses a top-up that is %s: only a credited one can be reversed, and only once', async (status) => {
      tx.merchantManualTopUp.findUnique.mockResolvedValue(topUp({ status }));

      await expect(repository.reverse({ topUpId: 'top-1', adminId: 'admin-2', reason: 'Wrong merchant' })).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.merchantWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('lists', () => {
    it('lists a merchant’s top-ups newest first, and the waiting ones oldest first', async () => {
      prisma.merchantManualTopUp.findMany.mockResolvedValue([]);
      prisma.merchantManualTopUp.count.mockResolvedValue(0);

      await repository.findByMerchant('m-1', 2, 10);
      await repository.findPendingApproval(1, 20);

      expect(prisma.merchantManualTopUp.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { merchantWallet: { merchantId: 'm-1' } }, skip: 10, take: 10, orderBy: { createdAt: 'desc' } }));
      expect(prisma.merchantManualTopUp.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { status: 'PENDING_APPROVAL' }, orderBy: { createdAt: 'asc' } }));
    });
  });
});
