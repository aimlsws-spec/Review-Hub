import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { RazorpayService } from '../../payment/services';
import { MerchantBankRepository, MerchantRefundRepository, MerchantRepository, MerchantWalletRepository } from '../repositories';

import { RefundService } from './refund.service';

describe('RefundService', () => {
  let service: RefundService;

  const mockRefundRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByMerchantWalletId: jest.fn(),
    findPendingForAdmin: jest.fn(),
    createLog: jest.fn(),
  };
  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    holdForRefund: jest.fn(),
    releaseRefundHold: jest.fn(),
    finalizeRefund: jest.fn(),
  };
  const mockMerchantRepository = { findById: jest.fn() };
  const mockBankRepository = { findById: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockRazorpayService = {
    createCustomer: jest.fn(),
    createFundAccount: jest.fn(),
    createPayout: jest.fn(),
  };

  const merchant = { id: 'merchant-1', verificationStatus: 'APPROVED' };
  const wallet = { id: 'wallet-1', availableBalance: 5000 };
  const bankAccount = { id: 'bank-1', merchantId: 'merchant-1', verificationStatus: 'PENDING' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: MerchantRefundRepository, useValue: mockRefundRepository },
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantBankRepository, useValue: mockBankRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    jest.clearAllMocks();
    mockMerchantRepository.findById.mockResolvedValue(merchant);
  });

  describe('request', () => {
    it('should reject when the merchant does not exist', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(NotFoundException);
    });

    it('should reject when business verification is not APPROVED', async () => {
      mockMerchantRepository.findById.mockResolvedValue({ ...merchant, verificationStatus: 'PENDING' });

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
      expect(mockBankRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject a bank account owned by another merchant', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, merchantId: 'someone-else' });

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(NotFoundException);
    });

    it('should reject a bank account that failed verification', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, verificationStatus: 'FAILED' });

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
    });

    it('should reject when the wallet balance is insufficient', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue({ ...wallet, availableBalance: 1000 });

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
      expect(mockRefundRepository.create).not.toHaveBeenCalled();
    });

    it('should create the request and hold the funds', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue(wallet);
      mockRefundRepository.create.mockResolvedValue({ id: 'refund-1' });
      mockRefundRepository.findById.mockResolvedValue({ id: 'refund-1', status: 'PENDING' });

      const result = await service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' });

      expect(result).toHaveProperty('id', 'refund-1');
      expect(mockWalletRepository.holdForRefund).toHaveBeenCalledWith({
        merchantWalletId: 'wallet-1',
        amount: 1500,
        refundId: 'refund-1',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.refund.requested', expect.any(Object));
    });

    it('should cancel the orphaned request if the hold fails on a race', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue(wallet);
      mockRefundRepository.create.mockResolvedValue({ id: 'refund-1' });
      mockWalletRepository.holdForRefund.mockRejectedValue(new BadRequestException('Insufficient wallet balance'));

      await expect(service.request('merchant-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
      expect(mockRefundRepository.update).toHaveBeenCalledWith('refund-1', expect.objectContaining({ status: 'CANCELLED' }));
    });
  });

  describe('getMine', () => {
    it('should hide a refund owned by another merchant as not found', async () => {
      mockRefundRepository.findById.mockResolvedValue({ id: 'refund-1', merchantWallet: { merchantId: 'someone-else' } });

      await expect(service.getMine('refund-1', 'merchant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should finalize the hold and mark the request APPROVED', async () => {
      mockRefundRepository.findById
        .mockResolvedValueOnce({
          id: 'refund-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 1500, merchantWallet: { merchantId: 'merchant-1' },
        })
        .mockResolvedValueOnce({ id: 'refund-1', status: 'APPROVED' });
      mockRefundRepository.update.mockResolvedValue({ id: 'refund-1', status: 'APPROVED' });

      const result = await service.approve('refund-1', 'admin-1');

      expect(result).toHaveProperty('status', 'APPROVED');
      expect(mockWalletRepository.finalizeRefund).toHaveBeenCalledWith({
        merchantWalletId: 'wallet-1', amount: 1500, refundId: 'refund-1',
      });
      expect(mockRefundRepository.createLog).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', entity: 'MerchantRefundRequest' }),
      );
    });

    it('should reject approving an already-approved refund', async () => {
      mockRefundRepository.findById.mockResolvedValue({ id: 'refund-1', status: 'APPROVED' });

      await expect(service.approve('refund-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should initiate a RazorpayX payout and set status PROCESSING when a bank account is on file', async () => {
      const bankAccountOnFile = { accountHolderName: 'Acme Foods', accountNumber: '1234567890', ifscCode: 'HDFC0000053' };
      mockRefundRepository.findById.mockResolvedValue({
        id: 'refund-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 1500,
        merchantWallet: { merchantId: 'merchant-1' }, bankAccount: bankAccountOnFile,
      });
      mockRefundRepository.update.mockResolvedValue({ id: 'refund-1', status: 'PROCESSING' });
      mockRazorpayService.createCustomer.mockResolvedValue({ id: 'cust_1' });
      mockRazorpayService.createFundAccount.mockResolvedValue({ id: 'fa_1' });
      mockRazorpayService.createPayout.mockResolvedValue({ id: 'pout_1', status: 'queued', utr: null });

      await service.approve('refund-1', 'admin-1');

      expect(mockRazorpayService.createPayout).toHaveBeenCalledWith({
        fundAccountId: 'fa_1', amountInRupees: 1500, referenceId: 'refund-1', narration: 'Merchant refund payout',
      });
      expect(mockRefundRepository.update).toHaveBeenCalledWith('refund-1', {
        status: 'PROCESSING',
        metadata: { razorpayPayoutId: 'pout_1', razorpayFundAccountId: 'fa_1' },
      });
    });

    it('should not throw and should record the error when the payout API call fails', async () => {
      const bankAccountOnFile = { accountHolderName: 'Acme Foods', accountNumber: '1234567890', ifscCode: 'HDFC0000053' };
      mockRefundRepository.findById.mockResolvedValue({
        id: 'refund-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 1500,
        merchantWallet: { merchantId: 'merchant-1' }, bankAccount: bankAccountOnFile,
      });
      mockRefundRepository.update.mockResolvedValue({ id: 'refund-1', status: 'APPROVED' });
      mockRazorpayService.createCustomer.mockRejectedValue(new Error('Razorpay API unavailable'));

      await expect(service.approve('refund-1', 'admin-1')).resolves.toBeDefined();

      expect(mockRefundRepository.update).toHaveBeenCalledWith('refund-1', {
        metadata: { payoutInitiationError: 'Razorpay API unavailable' },
      });
    });

    it('should not attempt a payout when the refund has no bank account on file', async () => {
      mockRefundRepository.findById.mockResolvedValue({
        id: 'refund-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 1500,
        merchantWallet: { merchantId: 'merchant-1' }, bankAccount: null,
      });
      mockRefundRepository.update.mockResolvedValue({ id: 'refund-1', status: 'APPROVED' });

      await service.approve('refund-1', 'admin-1');

      expect(mockRazorpayService.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should release the hold and mark the request REJECTED', async () => {
      mockRefundRepository.findById.mockResolvedValue({
        id: 'refund-1', status: 'PENDING', merchantWalletId: 'wallet-1', amount: 1500, merchantWallet: { merchantId: 'merchant-1' },
      });
      mockRefundRepository.update.mockResolvedValue({ id: 'refund-1', status: 'REJECTED' });

      const result = await service.reject('refund-1', 'admin-1', { rejectionReason: 'Bank mismatch' });

      expect(result).toHaveProperty('status', 'REJECTED');
      expect(mockWalletRepository.releaseRefundHold).toHaveBeenCalledWith({
        merchantWalletId: 'wallet-1', amount: 1500, refundId: 'refund-1',
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'REJECT' }),
      );
    });
  });

  describe('listPendingForAdmin', () => {
    it('should delegate to the repository', async () => {
      mockRefundRepository.findPendingForAdmin.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listPendingForAdmin(1, 20);
      expect(mockRefundRepository.findPendingForAdmin).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });
});
