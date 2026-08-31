import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { RazorpayService } from '../../payment/services';
import { UserBankAccountRepository, UserWalletRepository, WithdrawalRepository } from '../repositories';

import { WithdrawalService } from './withdrawal.service';

describe('WithdrawalService', () => {
  let service: WithdrawalService;

  const mockWithdrawalRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByWalletId: jest.fn(),
    findPendingForAdmin: jest.fn(),
    createLog: jest.fn(),
  };
  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    holdForWithdrawal: jest.fn(),
    releaseHold: jest.fn(),
    finalizeWithdrawal: jest.fn(),
  };
  const mockBankRepository = { findById: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockRazorpayService = {
    createCustomer: jest.fn(),
    createFundAccount: jest.fn(),
    createPayout: jest.fn(),
  };

  const wallet = { id: 'wallet-1', availableBalance: 5000 };
  const bankAccount = { id: 'bank-1', userId: 'user-1', verificationStatus: 'PENDING' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        { provide: WithdrawalRepository, useValue: mockWithdrawalRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: UserBankAccountRepository, useValue: mockBankRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should reject amounts below the minimum', async () => {
      await expect(service.request('user-1', { amount: 500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
    });

    it('should reject a bank account owned by someone else', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, userId: 'someone-else' });

      await expect(service.request('user-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(NotFoundException);
    });

    it('should reject a bank account that failed verification', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, verificationStatus: 'FAILED' });

      await expect(service.request('user-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
    });

    it('should reject when the wallet balance is insufficient', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue({ ...wallet, availableBalance: 1000 });

      await expect(service.request('user-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
      expect(mockWithdrawalRepository.create).not.toHaveBeenCalled();
    });

    it('should create the request and hold the funds', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue(wallet);
      mockWithdrawalRepository.create.mockResolvedValue({ id: 'withdrawal-1' });
      mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'PENDING' });

      const result = await service.request('user-1', { amount: 1500, bankAccountId: 'bank-1' });

      expect(result).toHaveProperty('id', 'withdrawal-1');
      expect(mockWalletRepository.holdForWithdrawal).toHaveBeenCalledWith({
        walletId: 'wallet-1',
        amount: 1500,
        withdrawalId: 'withdrawal-1',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.requested', expect.any(Object));
    });

    it('should cancel the orphaned request if the hold fails on a race', async () => {
      mockBankRepository.findById.mockResolvedValue(bankAccount);
      mockWalletRepository.getOrCreate.mockResolvedValue(wallet);
      mockWithdrawalRepository.create.mockResolvedValue({ id: 'withdrawal-1' });
      mockWalletRepository.holdForWithdrawal.mockRejectedValue(new BadRequestException('Insufficient wallet balance'));

      await expect(service.request('user-1', { amount: 1500, bankAccountId: 'bank-1' })).rejects.toThrow(BadRequestException);
      expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', expect.objectContaining({ status: 'CANCELLED' }));
    });
  });

  describe('getMine', () => {
    it('should hide a withdrawal owned by someone else as not found', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', wallet: { userId: 'someone-else' } });

      await expect(service.getMine('withdrawal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should finalize the hold and mark the request APPROVED', async () => {
      mockWithdrawalRepository.findById
        .mockResolvedValueOnce({
          id: 'withdrawal-1', status: 'PENDING', walletId: 'wallet-1', amount: 1500, wallet: { userId: 'user-1' },
        })
        .mockResolvedValueOnce({ id: 'withdrawal-1', status: 'APPROVED' });
      mockWithdrawalRepository.update.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED' });

      const result = await service.approve('withdrawal-1', 'admin-1');

      expect(result).toHaveProperty('status', 'APPROVED');
      expect(mockWalletRepository.finalizeWithdrawal).toHaveBeenCalledWith({
        walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1',
      });
      expect(mockWithdrawalRepository.createLog).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', entity: 'WithdrawalRequest' }),
      );
    });

    it('should reject approving an already-approved withdrawal', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED' });

      await expect(service.approve('withdrawal-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should initiate a RazorpayX payout and set status PROCESSING when a bank account is on file', async () => {
      const bankAccountOnFile = { accountHolderName: 'Jane Doe', accountNumber: '1234567890', ifscCode: 'HDFC0000053' };
      mockWithdrawalRepository.findById.mockResolvedValue({
        id: 'withdrawal-1', status: 'PENDING', walletId: 'wallet-1', amount: 1500, finalAmount: 1500,
        wallet: { userId: 'user-1' }, bankAccount: bankAccountOnFile,
      });
      mockWithdrawalRepository.update.mockResolvedValue({ id: 'withdrawal-1', status: 'PROCESSING' });
      mockRazorpayService.createCustomer.mockResolvedValue({ id: 'cust_1' });
      mockRazorpayService.createFundAccount.mockResolvedValue({ id: 'fa_1' });
      mockRazorpayService.createPayout.mockResolvedValue({ id: 'pout_1', status: 'queued', utr: null });

      await service.approve('withdrawal-1', 'admin-1');

      expect(mockRazorpayService.createPayout).toHaveBeenCalledWith({
        fundAccountId: 'fa_1', amountInRupees: 1500, referenceId: 'withdrawal-1',
      });
      expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', {
        status: 'PROCESSING',
        metadata: { razorpayPayoutId: 'pout_1', razorpayFundAccountId: 'fa_1' },
      });
    });

    it('should not throw and should record the error when the payout API call fails', async () => {
      const bankAccountOnFile = { accountHolderName: 'Jane Doe', accountNumber: '1234567890', ifscCode: 'HDFC0000053' };
      mockWithdrawalRepository.findById.mockResolvedValue({
        id: 'withdrawal-1', status: 'PENDING', walletId: 'wallet-1', amount: 1500, finalAmount: 1500,
        wallet: { userId: 'user-1' }, bankAccount: bankAccountOnFile,
      });
      mockWithdrawalRepository.update.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED' });
      mockRazorpayService.createCustomer.mockRejectedValue(new Error('Razorpay API unavailable'));

      await expect(service.approve('withdrawal-1', 'admin-1')).resolves.toBeDefined();

      expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', {
        metadata: { payoutInitiationError: 'Razorpay API unavailable' },
      });
    });

    it('should not attempt a payout when the withdrawal has no bank account on file', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({
        id: 'withdrawal-1', status: 'PENDING', walletId: 'wallet-1', amount: 1500, finalAmount: 1500,
        wallet: { userId: 'user-1' }, bankAccount: null,
      });
      mockWithdrawalRepository.update.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED' });

      await service.approve('withdrawal-1', 'admin-1');

      expect(mockRazorpayService.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should release the hold and mark the request REJECTED', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({
        id: 'withdrawal-1', status: 'PENDING', walletId: 'wallet-1', amount: 1500, wallet: { userId: 'user-1' },
      });
      mockWithdrawalRepository.update.mockResolvedValue({ id: 'withdrawal-1', status: 'REJECTED' });

      const result = await service.reject('withdrawal-1', 'admin-1', { rejectionReason: 'Bank mismatch' });

      expect(result).toHaveProperty('status', 'REJECTED');
      expect(mockWalletRepository.releaseHold).toHaveBeenCalledWith({
        walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1',
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'REJECT' }),
      );
    });
  });

  describe('listPendingForAdmin', () => {
    it('should delegate to the repository', async () => {
      mockWithdrawalRepository.findPendingForAdmin.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listPendingForAdmin(1, 20);
      expect(mockWithdrawalRepository.findPendingForAdmin).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });
});
