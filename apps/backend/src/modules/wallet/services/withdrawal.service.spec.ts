import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { PAYMENT_PROVIDER } from '../../payment/interfaces';
import { AccountLinkageService } from '../../risk/services';
import { UserKycService } from '../../user-kyc/services';
import { UserBankAccountRepository, UserWalletRepository, WithdrawalRepository, WithdrawalSettlementRepository } from '../repositories';

import { WithdrawalPolicyService, WithdrawalSettings } from './withdrawal-policy.service';
import { WithdrawalService } from './withdrawal.service';

describe('WithdrawalService', () => {
  let service: WithdrawalService;

  const mockWithdrawalRepository = { findById: jest.fn(), update: jest.fn(), findPendingForAdmin: jest.fn() };
  const mockWalletRepository = { getOrCreate: jest.fn() };
  const mockSettlementRepository = {
    request: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    markProcessing: jest.fn(),
    markPaid: jest.fn(),
    markFailed: jest.fn(),
    findAwaitingManualPayout: jest.fn(),
  };
  const mockBankRepository = { findById: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockPayments = { createCustomer: jest.fn(), createFundAccount: jest.fn(), createPayout: jest.fn() };
  const mockUserKycService = { isPanVerified: jest.fn() };
  const mockDeviceRepository = { findById: jest.fn() };
  const mockAccountLinkage = { assess: jest.fn() };

  const settings: WithdrawalSettings = {
    minimum: 1000,
    maximum: 50000,
    dailyLimit: 50000,
    monthlyLimit: null,
    bankCoolingHours: 24,
    payoutMode: 'GATEWAY',
    tds: { rate: 0, annualThreshold: 0, section: null },
  };
  const mockSettings = jest.fn();

  const wallet = { id: 'wallet-1', availableBalance: 5000 };
  const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const bankAccount = { id: 'bank-1', userId: 'user-1', verificationStatus: 'PENDING', createdAt: longAgo, detailsChangedAt: null };
  const ask = { amount: 1500, bankAccountId: 'bank-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        WithdrawalPolicyService,
        { provide: WithdrawalRepository, useValue: mockWithdrawalRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: WithdrawalSettlementRepository, useValue: mockSettlementRepository },
        { provide: UserBankAccountRepository, useValue: mockBankRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: PAYMENT_PROVIDER, useValue: mockPayments },
        { provide: UserKycService, useValue: mockUserKycService },
        { provide: DeviceRepository, useValue: mockDeviceRepository },
        { provide: AccountLinkageService, useValue: mockAccountLinkage },
        // The real policy rules run; only where the settings come from is replaced (see getSettings below).
        { provide: PrismaService, useValue: { platformConfiguration: { findFirst: jest.fn() } } },
      ],
    }).compile();

    service = module.get(WithdrawalService);
    jest.resetAllMocks();
    // Every test starts as a normal, allowed request: the rules as configured, PAN verified, nothing linked.
    jest.spyOn(module.get(WithdrawalPolicyService), 'getSettings').mockImplementation(async () => mockSettings());
    mockSettings.mockReturnValue(settings);
    mockAccountLinkage.assess.mockResolvedValue({ points: 0, holdRecommended: false, accounts: [] });
    mockUserKycService.isPanVerified.mockResolvedValue(true);
    mockBankRepository.findById.mockResolvedValue(bankAccount);
    mockWalletRepository.getOrCreate.mockResolvedValue(wallet);
    mockSettlementRepository.request.mockResolvedValue({ id: 'withdrawal-1' });
    mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'PENDING' });
  });

  describe('request', () => {
    it('refuses an amount below the minimum the platform is set to', async () => {
      await expect(service.request('user-1', { amount: 500, bankAccountId: 'bank-1' })).rejects.toThrow(/Minimum withdrawal amount is ₹1,000/);
      expect(mockSettlementRepository.request).not.toHaveBeenCalled();
    });

    it('follows the minimum when an admin changes it', async () => {
      mockSettings.mockReturnValue({ ...settings, minimum: 200 });

      await expect(service.request('user-1', { amount: 250, bankAccountId: 'bank-1' })).resolves.toBeDefined();
    });

    it('refuses an amount above the most allowed at a time', async () => {
      await expect(service.request('user-1', { amount: 50001, bankAccountId: 'bank-1' })).rejects.toThrow(/Maximum withdrawal amount is ₹50,000/);
    });

    it('refuses when PAN has not been verified', async () => {
      mockUserKycService.isPanVerified.mockResolvedValue(false);

      await expect(service.request('user-1', ask)).rejects.toThrow(BadRequestException);
      expect(mockBankRepository.findById).not.toHaveBeenCalled();
    });

    it('refuses a bank account owned by someone else', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, userId: 'someone-else' });
      await expect(service.request('user-1', ask)).rejects.toThrow(NotFoundException);
    });

    it('refuses a bank account that failed verification', async () => {
      mockBankRepository.findById.mockResolvedValue({ ...bankAccount, verificationStatus: 'FAILED' });
      await expect(service.request('user-1', ask)).rejects.toThrow(BadRequestException);
    });

    describe('the cooling period for a new bank account', () => {
      const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

      it('refuses a bank account added a few hours ago, and says roughly how long is left', async () => {
        mockBankRepository.findById.mockResolvedValue({ ...bankAccount, createdAt: hoursAgo(2) });

        await expect(service.request('user-1', ask)).rejects.toThrow(/about 22 hours/);
        expect(mockSettlementRepository.request).not.toHaveBeenCalled();
      });

      it('allows it once the wait is over', async () => {
        mockBankRepository.findById.mockResolvedValue({ ...bankAccount, createdAt: hoursAgo(25) });
        await expect(service.request('user-1', ask)).resolves.toBeDefined();
      });

      it('starts the wait again when the payout details were changed, even on an old account', async () => {
        mockBankRepository.findById.mockResolvedValue({ ...bankAccount, detailsChangedAt: hoursAgo(1) });
        await expect(service.request('user-1', ask)).rejects.toThrow(/recently/);
      });

      it('can be turned off with 0 hours', async () => {
        mockSettings.mockReturnValue({ ...settings, bankCoolingHours: 0 });
        mockBankRepository.findById.mockResolvedValue({ ...bankAccount, createdAt: new Date() });

        await expect(service.request('user-1', ask)).resolves.toBeDefined();
      });
    });

    it('creates the request and sets the money aside in one step, with the limits the platform is set to', async () => {
      mockSettings.mockReturnValue({ ...settings, dailyLimit: 20000, monthlyLimit: 90000 });

      const result = await service.request('user-1', ask);

      expect(result).toHaveProperty('id', 'withdrawal-1');
      expect(mockSettlementRepository.request).toHaveBeenCalledWith({
        walletId: 'wallet-1',
        bankAccountId: 'bank-1',
        amount: 1500,
        status: 'PENDING',
        limits: { daily: 20000, monthly: 90000 },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.requested', expect.any(Object));
    });

    it('does not tell anyone about a request the limits refused', async () => {
      mockSettlementRepository.request.mockRejectedValue(new BadRequestException('You have reached your daily withdrawal limit'));

      await expect(service.request('user-1', ask)).rejects.toThrow(/daily withdrawal limit/);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('holds the request for review when the device risk score is at or above the threshold', async () => {
      mockDeviceRepository.findById.mockResolvedValue({ id: 'device-1', userId: 'user-1', riskScore: 80 });

      await service.request('user-1', ask, 'device-1');

      expect(mockSettlementRepository.request).toHaveBeenCalledWith(expect.objectContaining({ status: 'UNDER_REVIEW' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'SYSTEM', action: 'STATUS_CHANGE', entityId: 'withdrawal-1' }),
      );
    });

    it('leaves it PENDING when the device risk score is below the threshold, or the device is not theirs', async () => {
      mockDeviceRepository.findById.mockResolvedValue({ id: 'device-1', userId: 'user-1', riskScore: 60 });
      await service.request('user-1', ask, 'device-1');
      mockDeviceRepository.findById.mockResolvedValue({ id: 'device-1', userId: 'someone-else', riskScore: 100 });
      await service.request('user-1', ask, 'device-1');

      expect(mockSettlementRepository.request.mock.calls.map((call) => call[0].status)).toEqual(['PENDING', 'PENDING']);
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });

    describe('holding a withdrawal for linked accounts', () => {
      const linked = { points: 60, holdRecommended: true, accounts: [{ userId: 'other', name: 'Other', status: 'ACTIVE', kinds: ['PAN'] }] };

      it('holds the request when the account shares a PAN or bank account with another', async () => {
        mockAccountLinkage.assess.mockResolvedValue(linked);

        await service.request('user-1', ask);

        expect(mockSettlementRepository.request).toHaveBeenCalledWith(expect.objectContaining({ status: 'UNDER_REVIEW' }));
        expect(mockAuditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ actorType: 'SYSTEM', after: { status: 'UNDER_REVIEW', reason: 'linked_accounts' } }),
        );
      });

      it('checks for linked accounts even when no device id was sent', async () => {
        await service.request('user-1', ask);

        expect(mockDeviceRepository.findById).not.toHaveBeenCalled();
        expect(mockAccountLinkage.assess).toHaveBeenCalled();
      });

      it('explains a hold for device risk as device risk, and does not check linkage after it', async () => {
        mockDeviceRepository.findById.mockResolvedValue({ id: 'device-1', userId: 'user-1', riskScore: 90 });

        await service.request('user-1', ask, 'device-1');

        expect(mockAuditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ after: { status: 'UNDER_REVIEW', reason: 'high_device_risk_score' } }),
        );
        expect(mockAccountLinkage.assess).not.toHaveBeenCalled();
      });

      it('fails open when the linkage check itself errors: an outage must not block honest withdrawals', async () => {
        mockAccountLinkage.assess.mockRejectedValue(new Error('database unavailable'));

        await expect(service.request('user-1', ask)).resolves.toBeDefined();
        expect(mockSettlementRepository.request).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
      });
    });
  });

  describe('getMine', () => {
    it('hides a withdrawal owned by someone else as not found', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', wallet: { userId: 'someone-else' } });
      await expect(service.getMine('withdrawal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    const approved = { id: 'withdrawal-1', wallet: { userId: 'user-1' } };
    const onFile = { accountHolderName: 'Jane Doe', accountNumber: '1234567890', ifscCode: 'HDFC0000053' };

    beforeEach(() => {
      mockSettlementRepository.approve.mockResolvedValue(approved);
      mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED', finalAmount: 1500, bankAccount: onFile, metadata: null });
    });

    it('approves through the locked settlement step, tells the user, and writes an audit entry', async () => {
      await service.approve('withdrawal-1', 'admin-1');

      expect(mockSettlementRepository.approve).toHaveBeenCalledWith({
        withdrawalId: 'withdrawal-1',
        reviewerId: 'admin-1',
        payoutMode: 'GATEWAY',
        tds: { rate: 0, threshold: 0, section: null },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.approved', expect.objectContaining({ userId: 'user-1', approved: true }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', after: { status: 'APPROVED', payoutMode: 'GATEWAY' } }),
      );
    });

    it('does not go on to pay a withdrawal that could not be approved, for example already approved by another admin', async () => {
      mockSettlementRepository.approve.mockRejectedValue(new BadRequestException('Withdrawal is already approved'));

      await expect(service.approve('withdrawal-1', 'admin-1')).rejects.toThrow(/already approved/);
      expect(mockPayments.createPayout).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });

    describe('paying through the gateway', () => {
      beforeEach(() => {
        mockPayments.createCustomer.mockResolvedValue({ id: 'cust_1' });
        mockPayments.createFundAccount.mockResolvedValue({ id: 'fa_1' });
        mockPayments.createPayout.mockResolvedValue({ id: 'pout_1', status: 'queued', utr: null });
        mockSettlementRepository.markProcessing.mockResolvedValue({ applied: true });
      });

      it('starts the payout and moves the withdrawal to processing', async () => {
        await service.approve('withdrawal-1', 'admin-1');

        expect(mockPayments.createPayout).toHaveBeenCalledWith({ fundAccountId: 'fa_1', amountInRupees: 1500, referenceId: 'withdrawal-1' });
        expect(mockSettlementRepository.markProcessing).toHaveBeenCalledWith({
          withdrawalId: 'withdrawal-1',
          metadata: { razorpayPayoutId: 'pout_1', razorpayFundAccountId: 'fa_1' },
        });
      });

      it('keeps the error, and does not throw, when the gateway call fails: an admin can then pay it by hand', async () => {
        mockPayments.createCustomer.mockRejectedValue(new Error('Razorpay API unavailable'));
        mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED', bankAccount: onFile, metadata: { note: 'kept' } });

        await expect(service.approve('withdrawal-1', 'admin-1')).resolves.toBeDefined();

        expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', {
          metadata: { note: 'kept', payoutInitiationError: 'Razorpay API unavailable' },
        });
      });

      it('makes no payout when there is no bank account on file', async () => {
        mockWithdrawalRepository.findById.mockResolvedValue({ id: 'withdrawal-1', status: 'APPROVED', bankAccount: null });

        await service.approve('withdrawal-1', 'admin-1');

        expect(mockPayments.createCustomer).not.toHaveBeenCalled();
      });
    });

    describe('keeping tax back', () => {
      it('hands the TDS settings to the approval, which does the sums', async () => {
        mockSettings.mockReturnValue({ ...settings, tds: { rate: 0.1, annualThreshold: 20000, section: '194R' } });

        await service.approve('withdrawal-1', 'admin-1');

        expect(mockSettlementRepository.approve).toHaveBeenCalledWith(expect.objectContaining({ tds: { rate: 0.1, threshold: 20000, section: '194R' } }));
      });

      it('records the tax kept back in the audit entry', async () => {
        mockSettlementRepository.approve.mockResolvedValue({ ...approved, tdsAmount: '150.00' });

        await service.approve('withdrawal-1', 'admin-1');

        expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ after: { status: 'APPROVED', payoutMode: 'GATEWAY', tdsAmount: 150 } }));
      });
    });

    describe('paying by hand', () => {
      beforeEach(() => mockSettings.mockReturnValue({ ...settings, payoutMode: 'MANUAL' }));

      it('approves and records the mode, and starts nothing with the gateway', async () => {
        await service.approve('withdrawal-1', 'admin-1');

        expect(mockSettlementRepository.approve).toHaveBeenCalledWith(expect.objectContaining({ payoutMode: 'MANUAL' }));
        expect(mockPayments.createCustomer).not.toHaveBeenCalled();
        expect(mockPayments.createPayout).not.toHaveBeenCalled();
      });
    });
  });

  describe('reject', () => {
    it('rejects through the settlement step and tells the user', async () => {
      mockSettlementRepository.reject.mockResolvedValue({ id: 'withdrawal-1', status: 'REJECTED', wallet: { userId: 'user-1' } });

      const result = await service.reject('withdrawal-1', 'admin-1', { rejectionReason: 'Bank mismatch' });

      expect(result).toHaveProperty('status', 'REJECTED');
      expect(mockSettlementRepository.reject).toHaveBeenCalledWith({ withdrawalId: 'withdrawal-1', reviewerId: 'admin-1', reason: 'Bank mismatch' });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.rejected', expect.objectContaining({ approved: false }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin-1', action: 'REJECT' }));
    });

    it('does nothing more when the withdrawal was already settled', async () => {
      mockSettlementRepository.reject.mockRejectedValue(new BadRequestException('Withdrawal is already approved'));

      await expect(service.reject('withdrawal-1', 'admin-1', { rejectionReason: 'Bank mismatch' })).rejects.toThrow();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('marking a withdrawal paid by hand', () => {
    const paid = { applied: true, withdrawal: { id: 'withdrawal-1', amount: 1500, wallet: { userId: 'user-1' } } };

    it('records the normalized bank reference, who did it, tells the user and audits it', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue(paid);

      await service.markPaid('withdrawal-1', 'admin-1', { reference: 'utr 123 456 789', note: 'Sent by NEFT' });

      expect(mockSettlementRepository.markPaid).toHaveBeenCalledWith({
        withdrawalId: 'withdrawal-1',
        source: 'MANUAL',
        reference: 'UTR123456789',
        actorId: 'admin-1',
        note: 'Sent by NEFT',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.paid', expect.objectContaining({ userId: 'user-1', amount: 1500, reference: 'UTR123456789' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', after: { status: 'PAID', payoutMode: 'MANUAL', payoutReference: 'UTR123456789' } }),
      );
    });

    it('refuses a withdrawal that is already paid, and does not tell the user twice', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue({ applied: false, reason: 'already_paid', status: 'PAID' });

      await expect(service.markPaid('withdrawal-1', 'admin-1', { reference: 'UTR123456789' })).rejects.toThrow(/already paid/);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('marking a withdrawal failed by hand', () => {
    it('returns the money through the settlement step, tells the user why, and audits it', async () => {
      mockSettlementRepository.markFailed.mockResolvedValue({ applied: true, withdrawal: { id: 'withdrawal-1', amount: 1500, wallet: { userId: 'user-1' } } });

      await service.markFailed('withdrawal-1', 'admin-1', { reason: 'Account number rejected by the bank' });

      expect(mockSettlementRepository.markFailed).toHaveBeenCalledWith({
        withdrawalId: 'withdrawal-1',
        source: 'MANUAL',
        reason: 'Account number rejected by the bank',
        actorId: 'admin-1',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.failed', expect.objectContaining({ userId: 'user-1', reason: 'Account number rejected by the bank' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ after: { status: 'FAILED', reason: 'Account number rejected by the bank' } }));
    });

    it('says what state it is in when it can not be marked failed', async () => {
      mockSettlementRepository.markFailed.mockResolvedValue({ applied: false, reason: 'unexpected_paid', status: 'PAID' });

      await expect(service.markFailed('withdrawal-1', 'admin-1', { reason: 'Any reason here' })).rejects.toThrow(/is paid/);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('lists', () => {
    it('lists the withdrawals waiting for a person to send the money', async () => {
      mockSettlementRepository.findAwaitingManualPayout.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listAwaitingManualPayout(1, 20);
      expect(mockSettlementRepository.findAwaitingManualPayout).toHaveBeenCalledWith(1, 20);
    });

    it('lists the withdrawals waiting for approval', async () => {
      mockWithdrawalRepository.findPendingForAdmin.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listPendingForAdmin(1, 20);
      expect(mockWithdrawalRepository.findPendingForAdmin).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });
});
