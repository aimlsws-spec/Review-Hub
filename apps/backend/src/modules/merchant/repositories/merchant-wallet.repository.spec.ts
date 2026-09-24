import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantWalletRepository } from './merchant-wallet.repository';

describe('MerchantWalletRepository', () => {
  let repository: MerchantWalletRepository;

  const mockTx = {
    // The row locks (SELECT ... FOR UPDATE) every balance change takes first.
    $queryRaw: jest.fn(),
    merchantWallet: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn(), findFirst: jest.fn() },
    campaign: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };

  const mockPrisma = {
    merchantWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantWalletRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MerchantWalletRepository>(MerchantWalletRepository);
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return the existing wallet when one exists', async () => {
      mockPrisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1' });

      const result = await repository.getOrCreate('merchant-1');
      expect(result).toEqual({ id: 'wallet-1' });
      expect(mockPrisma.merchantWallet.create).not.toHaveBeenCalled();
    });

    it('should create a wallet when none exists', async () => {
      mockPrisma.merchantWallet.findUnique.mockResolvedValue(null);
      mockPrisma.merchantWallet.create.mockResolvedValue({ id: 'wallet-1' });

      const result = await repository.getOrCreate('merchant-1');
      expect(result).toEqual({ id: 'wallet-1' });
      expect(mockPrisma.merchantWallet.create).toHaveBeenCalledWith({
        data: { merchant: { connect: { id: 'merchant-1' } } },
      });
    });
  });

  describe('createPendingTopUp', () => {
    it('should record a PENDING transaction without moving the balance', async () => {
      mockPrisma.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 1000 });
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'txn-1', status: 'PENDING' });

      const result = await repository.createPendingTopUp({ merchantWalletId: 'wallet-1', amount: 500, razorpayOrderId: 'order_1' });

      expect(result).toHaveProperty('status', 'PENDING');
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CREDIT',
          status: 'PENDING',
          amount: 500,
          balanceBefore: 1000,
          balanceAfter: 1000,
          referenceType: 'RazorpayOrder',
          referenceId: 'order_1',
        }),
      });
    });
  });

  describe('findPendingTopUpByOrderId', () => {
    it('should look up a PENDING transaction by the Razorpay order id', async () => {
      mockPrisma.walletTransaction.findFirst.mockResolvedValue({ id: 'txn-1' });

      await repository.findPendingTopUpByOrderId('order_1');
      expect(mockPrisma.walletTransaction.findFirst).toHaveBeenCalledWith({
        where: { referenceType: 'RazorpayOrder', referenceId: 'order_1', status: 'PENDING' },
      });
    });
  });

  describe('confirmTopUp', () => {
    it('should credit the wallet and mark the transaction SUCCESS', async () => {
      mockTx.walletTransaction.findUniqueOrThrow.mockResolvedValue({ id: 'txn-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 500 });
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 1000 });
      mockTx.walletTransaction.update.mockResolvedValue({ id: 'txn-1', status: 'SUCCESS' });

      const result = await repository.confirmTopUp('txn-1', 'pay_1');

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 1500, totalTopUp: { increment: 500 } },
      });
      expect(mockTx.walletTransaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        data: expect.objectContaining({ status: 'SUCCESS', balanceAfter: 1500, metadata: { razorpayPaymentId: 'pay_1' } }),
      });
      expect(result).toHaveProperty('status', 'SUCCESS');
    });

    it('should no-op idempotently for an already-processed transaction', async () => {
      mockTx.walletTransaction.findUniqueOrThrow.mockResolvedValue({ id: 'txn-1', status: 'SUCCESS', merchantWalletId: 'wallet-1', amount: 500 });

      const result = await repository.confirmTopUp('txn-1', 'pay_1');

      expect(result).toHaveProperty('status', 'SUCCESS');
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('failTopUp', () => {
    it('should mark the transaction FAILED with a reason', async () => {
      mockPrisma.walletTransaction.update.mockResolvedValue({ id: 'txn-1', status: 'FAILED' });

      await repository.failTopUp('txn-1', 'Signature mismatch');
      expect(mockPrisma.walletTransaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        data: { status: 'FAILED', remarks: 'Signature mismatch' },
      });
    });
  });

  describe('reserveCampaignBudget', () => {
    it('should move the budget from available to reserved and log a HOLD transaction', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 5000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'HOLD' });

      await repository.reserveCampaignBudget({ merchantId: 'merchant-1', campaignId: 'campaign-1', amount: 2000 });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 3000, reservedBalance: { increment: 2000 } },
      });
      expect(mockTx.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { reservedBudget: 2000 },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'HOLD', amount: 2000, referenceType: 'Campaign', referenceId: 'campaign-1' }),
      });
    });

    it('should reject when the wallet balance is insufficient, without moving anything', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });

      await expect(
        repository.reserveCampaignBudget({ merchantId: 'merchant-1', campaignId: 'campaign-1', amount: 2000 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
      expect(mockTx.campaign.update).not.toHaveBeenCalled();
    });
  });

  describe('spendCampaignBudget', () => {
    it('should move the amount from reserved to spent on both the wallet and the campaign', async () => {
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue({ id: 'campaign-1', merchantId: 'merchant-1', totalBudget: 2000, spentBudget: 0 });
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', reservedBalance: 2000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'SPEND' });

      await repository.spendCampaignBudget({ campaignId: 'campaign-1', amount: 300, rewardId: 'reward-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { reservedBalance: 1700, totalSpent: { increment: 300 } },
      });
      expect(mockTx.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { reservedBudget: { decrement: 300 }, spentBudget: 300, remainingBudget: 1700 },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SPEND', amount: 300, referenceType: 'Reward', referenceId: 'reward-1' }),
      });
    });
  });

  describe('releaseCampaignBudget', () => {
    it('should release the remaining reserved budget back to available balance', async () => {
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue({ id: 'campaign-1', reservedBudget: 1700 });
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 3000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'RELEASE' });

      await repository.releaseCampaignBudget({ merchantId: 'merchant-1', campaignId: 'campaign-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 4700, reservedBalance: { decrement: 1700 } },
      });
      expect(mockTx.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { reservedBudget: 0 },
      });
    });

    it('should no-op when nothing is reserved', async () => {
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue({ id: 'campaign-1', reservedBudget: 0 });

      const result = await repository.releaseCampaignBudget({ merchantId: 'merchant-1', campaignId: 'campaign-1' });

      expect(result).toBeNull();
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('restoreClawedBackBudget', () => {
    it('should restore the full amount to reserved balance and reverse the campaign spend, exactly inverting spendCampaignBudget', async () => {
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue({ id: 'campaign-1', merchantId: 'merchant-1', totalBudget: 2000, spentBudget: 300 });
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', reservedBalance: 1700 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'RELEASE' });

      await repository.restoreClawedBackBudget({ campaignId: 'campaign-1', amount: 300, rewardId: 'reward-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { reservedBalance: 2000, totalSpent: { decrement: 300 } },
      });
      expect(mockTx.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { reservedBudget: { increment: 300 }, spentBudget: 0, remainingBudget: 2000 },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'RELEASE', amount: 300, referenceType: 'Reward', referenceId: 'reward-1' }),
      });
    });
  });

  describe('holdForRefund', () => {
    it('should move the amount from available to refundBalance and log a HOLD transaction', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 5000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'HOLD' });

      await repository.holdForRefund({ merchantWalletId: 'wallet-1', amount: 2000, refundId: 'refund-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 3000, refundBalance: { increment: 2000 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'HOLD', amount: 2000, referenceType: 'MerchantRefundRequest', referenceId: 'refund-1' }),
      });
    });

    it('should reject when the wallet balance is insufficient, without moving anything', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 500 });

      await expect(
        repository.holdForRefund({ merchantWalletId: 'wallet-1', amount: 2000, refundId: 'refund-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('releaseRefundHold', () => {
    it('should move the amount back from refundBalance to available and log a RELEASE transaction', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 3000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'RELEASE' });

      await repository.releaseRefundHold({ merchantWalletId: 'wallet-1', amount: 2000, refundId: 'refund-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 5000, refundBalance: { decrement: 2000 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'RELEASE', amount: 2000, referenceType: 'MerchantRefundRequest', referenceId: 'refund-1' }),
      });
    });
  });

  describe('finalizeRefund', () => {
    it('should clear the refundBalance hold and increment totalRefunded', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', refundBalance: 2000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'REFUND' });

      await repository.finalizeRefund({ merchantWalletId: 'wallet-1', amount: 2000, refundId: 'refund-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { refundBalance: 0, totalRefunded: { increment: 2000 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'REFUND', amount: 2000, referenceType: 'MerchantRefundRequest', referenceId: 'refund-1' }),
      });
    });
  });

  describe('reverseFinalizedRefund', () => {
    it('should give the amount back to available balance and decrement totalRefunded', async () => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ id: 'wallet-1', availableBalance: 3000 });
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'txn-1', type: 'RELEASE' });

      await repository.reverseFinalizedRefund({ merchantWalletId: 'wallet-1', amount: 2000, refundId: 'refund-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { availableBalance: 5000, totalRefunded: { decrement: 2000 } },
      });
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'RELEASE', amount: 2000, referenceType: 'MerchantRefundRequest', referenceId: 'refund-1' }),
      });
    });
  });

  describe('row locking, so concurrent requests can not both spend the same balance', () => {
    const lockedTables = () => mockTx.$queryRaw.mock.calls.map(([strings]: [TemplateStringsArray]) => strings.join('?'));
    const wallet = { id: 'mw-1', merchantId: 'm-1', availableBalance: 5000, reservedBalance: 2000 };
    const campaign = { id: 'c-1', merchantId: 'm-1', reservedBudget: 1000, spentBudget: 0, remainingBudget: 1000 };

    beforeEach(() => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue(wallet);
      mockTx.merchantWallet.update.mockResolvedValue(wallet);
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue(campaign);
      mockTx.campaign.update.mockResolvedValue(campaign);
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'tx-1' });
      mockTx.walletTransaction.findUniqueOrThrow.mockResolvedValue({ id: 'tx-1', status: 'PENDING', merchantWalletId: 'mw-1', amount: 100 });
      mockTx.walletTransaction.update.mockResolvedValue({ id: 'tx-1' });
    });

    it('takes the campaign lock before the wallet lock when reserving a budget, in the agreed order', async () => {
      await repository.reserveCampaignBudget({ merchantId: 'm-1', campaignId: 'c-1', amount: 100 });

      expect(lockedTables()).toEqual([
        'SELECT id FROM campaigns WHERE id = ? FOR UPDATE',
        'SELECT id FROM merchant_wallets WHERE merchantId = ? FOR UPDATE',
      ]);
    });

    it.each([
      ['spendCampaignBudget', () => repository.spendCampaignBudget({ campaignId: 'c-1', amount: 50, rewardId: 'r-1' })],
      ['restoreClawedBackBudget', () => repository.restoreClawedBackBudget({ campaignId: 'c-1', amount: 50, rewardId: 'r-1' })],
      ['releaseCampaignBudget', () => repository.releaseCampaignBudget({ merchantId: 'm-1', campaignId: 'c-1' })],
    ])('%s locks the campaign, then the wallet, before reading either', async (_name, run) => {
      await run();

      expect(lockedTables()).toEqual([
        'SELECT id FROM campaigns WHERE id = ? FOR UPDATE',
        'SELECT id FROM merchant_wallets WHERE merchantId = ? FOR UPDATE',
      ]);
      const [campaignLock, walletLock] = mockTx.$queryRaw.mock.invocationCallOrder;
      expect(campaignLock).toBeLessThan(mockTx.campaign.findUniqueOrThrow.mock.invocationCallOrder[0]);
      expect(walletLock).toBeLessThan(mockTx.merchantWallet.findUniqueOrThrow.mock.invocationCallOrder[0]);
    });

    it.each([
      ['holdForRefund', () => repository.holdForRefund({ merchantWalletId: 'mw-1', amount: 100, refundId: 'rf-1' })],
      ['releaseRefundHold', () => repository.releaseRefundHold({ merchantWalletId: 'mw-1', amount: 100, refundId: 'rf-1' })],
      ['finalizeRefund', () => repository.finalizeRefund({ merchantWalletId: 'mw-1', amount: 100, refundId: 'rf-1' })],
      ['reverseFinalizedRefund', () => repository.reverseFinalizedRefund({ merchantWalletId: 'mw-1', amount: 100, refundId: 'rf-1' })],
    ])('%s locks the wallet row before reading the balance', async (_name, run) => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue({ ...wallet, reservedBalance: 5000 });

      await run();

      expect(lockedTables()[0]).toBe('SELECT id FROM merchant_wallets WHERE id = ? FOR UPDATE');
      expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockTx.merchantWallet.findUniqueOrThrow.mock.invocationCallOrder[0]);
    });

    it('confirming a top-up locks the payment first, then the wallet, so a webhook and a verify call can not both credit it', async () => {
      await repository.confirmTopUp('tx-1', 'pay_1');

      expect(lockedTables()).toEqual([
        'SELECT id FROM wallet_transactions WHERE id = ? FOR UPDATE',
        'SELECT id FROM merchant_wallets WHERE id = ? FOR UPDATE',
      ]);
      expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockTx.walletTransaction.findUniqueOrThrow.mock.invocationCallOrder[0]);
    });

    it('does not lock the wallet for a payment that was already confirmed', async () => {
      mockTx.walletTransaction.findUniqueOrThrow.mockResolvedValue({ id: 'tx-1', status: 'SUCCESS', merchantWalletId: 'mw-1', amount: 100 });

      await repository.confirmTopUp('tx-1', 'pay_1');

      expect(lockedTables()).toEqual(['SELECT id FROM wallet_transactions WHERE id = ? FOR UPDATE']);
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('spendCampaignBudget is idempotent per reward', () => {
    const wallet = { id: 'mw-1', merchantId: 'm-1', availableBalance: 5000, reservedBalance: 2000 };
    const campaign = { id: 'c-1', merchantId: 'm-1', reservedBudget: 1000, spentBudget: 0, totalBudget: 1000 };

    beforeEach(() => {
      mockTx.merchantWallet.findUniqueOrThrow.mockResolvedValue(wallet);
      mockTx.merchantWallet.update.mockResolvedValue(wallet);
      mockTx.campaign.findUniqueOrThrow.mockResolvedValue(campaign);
      mockTx.campaign.update.mockResolvedValue(campaign);
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'new-tx' });
    });

    it('does not charge the budget a second time for a reward already charged', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue({ id: 'old-tx' });

      const result = await repository.spendCampaignBudget({ campaignId: 'c-1', amount: 50, rewardId: 'r-1' });

      expect(result).toEqual({ id: 'old-tx' });
      expect(mockTx.merchantWallet.update).not.toHaveBeenCalled();
      expect(mockTx.campaign.update).not.toHaveBeenCalled();
      expect(mockTx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('checks for that reward under the locks, on this wallet, for a successful spend', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue({ id: 'old-tx' });

      await repository.spendCampaignBudget({ campaignId: 'c-1', amount: 50, rewardId: 'r-1' });

      expect(mockTx.walletTransaction.findFirst).toHaveBeenCalledWith({
        where: { merchantWalletId: 'mw-1', type: 'SPEND', referenceType: 'Reward', referenceId: 'r-1', status: 'SUCCESS' },
      });
      const locks = mockTx.$queryRaw.mock.invocationCallOrder;
      expect(locks[locks.length - 1]).toBeLessThan(mockTx.walletTransaction.findFirst.mock.invocationCallOrder[0]);
    });

    it('charges normally the first time', async () => {
      mockTx.walletTransaction.findFirst.mockResolvedValue(null);

      await repository.spendCampaignBudget({ campaignId: 'c-1', amount: 50, rewardId: 'r-1' });

      expect(mockTx.merchantWallet.update).toHaveBeenCalledTimes(1);
      expect(mockTx.campaign.update).toHaveBeenCalledTimes(1);
      expect(mockTx.walletTransaction.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAutoRechargeSettings', () => {
    it('saves the threshold and amount when enabling', async () => {
      mockPrisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1' });
      mockPrisma.merchantWallet.update.mockResolvedValue({ id: 'wallet-1', autoRechargeEnabled: true });

      await repository.updateAutoRechargeSettings('merchant-1', { enabled: true, threshold: 500, amount: 5000 });

      expect(mockPrisma.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { autoRechargeEnabled: true, autoRechargeThreshold: 500, autoRechargeAmount: 5000 },
      });
    });

    it('clears the threshold and amount when disabling, rather than leaving a stale value', async () => {
      mockPrisma.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1' });
      mockPrisma.merchantWallet.update.mockResolvedValue({ id: 'wallet-1', autoRechargeEnabled: false });

      await repository.updateAutoRechargeSettings('merchant-1', { enabled: false, threshold: 500, amount: 5000 });

      expect(mockPrisma.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { autoRechargeEnabled: false, autoRechargeThreshold: null, autoRechargeAmount: null },
      });
    });
  });

  describe('findWalletsDueForAutoRecharge', () => {
    it('queries with the raw SQL comparing availableBalance to autoRechargeThreshold', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'wallet-1' }]);

      const result = await repository.findWalletsDueForAutoRecharge(60);

      expect(result).toEqual([{ id: 'wallet-1' }]);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [sql] = mockPrisma.$queryRaw.mock.calls[0][0].strings ?? mockPrisma.$queryRaw.mock.calls[0];
      const asString = Array.isArray(sql) ? sql.join('?') : String(sql);
      expect(asString).toContain('merchant_wallets');
      expect(asString).toContain('availableBalance <= autoRechargeThreshold');
    });
  });

  describe('markAutoRechargeAttempted', () => {
    it('sets lastAutoRechargeAt to now', async () => {
      mockPrisma.merchantWallet.update.mockResolvedValue({ id: 'wallet-1' });

      await repository.markAutoRechargeAttempted('wallet-1');

      expect(mockPrisma.merchantWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { lastAutoRechargeAt: expect.any(Date) },
      });
    });
  });
});
