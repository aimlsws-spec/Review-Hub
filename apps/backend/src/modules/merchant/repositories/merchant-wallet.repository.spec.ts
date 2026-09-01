import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantWalletRepository } from './merchant-wallet.repository';

describe('MerchantWalletRepository', () => {
  let repository: MerchantWalletRepository;

  const mockTx = {
    merchantWallet: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() },
    campaign: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };

  const mockPrisma = {
    merchantWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
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
});
