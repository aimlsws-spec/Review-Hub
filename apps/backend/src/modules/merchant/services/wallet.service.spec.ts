import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RazorpayService } from '../../payment/services';
import { MerchantRepository, MerchantWalletRepository } from '../repositories';

import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  const mockMerchantRepository = {
    findById: jest.fn(),
  };

  const mockWalletRepository = {
    findByMerchantId: jest.fn(),
    findTransactions: jest.fn(),
    getOrCreate: jest.fn(),
    createPendingTopUp: jest.fn(),
    findPendingTopUpByOrderId: jest.fn(),
    confirmTopUp: jest.fn(),
  };

  const mockRazorpayService = {
    createOrder: jest.fn(),
    verifyPaymentSignature: jest.fn(),
  };

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-1',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
  };

  const mockWallet = {
    id: 'wallet-1',
    merchantId: 'merchant-1',
    availableBalance: 1000,
    reservedBalance: 200,
    totalTopUp: 5000,
    totalSpent: 3800,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should return wallet', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockWalletRepository.findByMerchantId.mockResolvedValue(mockWallet);

      const result = await service.getWallet('merchant-1');
      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException for unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.getWallet('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when wallet not found', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockWalletRepository.findByMerchantId.mockResolvedValue(null);

      await expect(service.getWallet('merchant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockWalletRepository.findByMerchantId.mockResolvedValue(mockWallet);
      mockWalletRepository.findTransactions.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const result = await service.getTransactions('merchant-1', 1, 20);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 0);
    });
  });

  describe('createRechargeOrder', () => {
    it('should create a Razorpay order and a pending transaction, without crediting anything', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockWalletRepository.getOrCreate.mockResolvedValue(mockWallet);
      mockRazorpayService.createOrder.mockResolvedValue({ id: 'order_1', amount: 500000, currency: 'INR', status: 'created' });

      const result = await service.createRechargeOrder('merchant-1', 5000);

      expect(result).toEqual({ razorpayOrderId: 'order_1', amount: 5000, currency: 'INR' });
      expect(mockWalletRepository.createPendingTopUp).toHaveBeenCalledWith({
        merchantWalletId: 'wallet-1',
        amount: 5000,
        razorpayOrderId: 'order_1',
      });
    });

    it('should throw NotFoundException for an unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.createRechargeOrder('unknown', 5000)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyRecharge', () => {
    const dto = { razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1' };

    it('should confirm the pending top-up when the signature is valid', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockWalletRepository.findPendingTopUpByOrderId.mockResolvedValue({ id: 'txn-1' });
      mockWalletRepository.confirmTopUp.mockResolvedValue({ id: 'txn-1', status: 'SUCCESS' });

      const result = await service.verifyRecharge('merchant-1', dto);

      expect(result).toHaveProperty('status', 'SUCCESS');
      expect(mockWalletRepository.confirmTopUp).toHaveBeenCalledWith('txn-1', 'pay_1');
    });

    it('should reject an invalid signature', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.verifyRecharge('merchant-1', dto)).rejects.toThrow(BadRequestException);
      expect(mockWalletRepository.confirmTopUp).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no pending recharge matches the order', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockWalletRepository.findPendingTopUpByOrderId.mockResolvedValue(null);

      await expect(service.verifyRecharge('merchant-1', dto)).rejects.toThrow(NotFoundException);
    });
  });
});
