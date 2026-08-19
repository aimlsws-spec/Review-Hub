import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantWalletRepository } from './merchant-wallet.repository';

describe('MerchantWalletRepository', () => {
  let repository: MerchantWalletRepository;

  const mockTx = {
    merchantWallet: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() },
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
});
