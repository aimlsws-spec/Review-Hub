import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserWalletRepository, WithdrawalRepository } from '../repositories';

import { PayoutListener } from './payout.listener';

describe('PayoutListener', () => {
  let listener: PayoutListener;

  const mockWithdrawalRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    createLog: jest.fn(),
  };
  const mockWalletRepository = {
    reverseFinalizedWithdrawal: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  const withdrawal = {
    id: 'withdrawal-1',
    walletId: 'wallet-1',
    amount: 1500,
    status: 'PROCESSING',
    metadata: { razorpayPayoutId: 'pout_1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutListener,
        { provide: WithdrawalRepository, useValue: mockWithdrawalRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    listener = module.get<PayoutListener>(PayoutListener);
    jest.clearAllMocks();
  });

  it('should warn and no-op when the event has no referenceId', async () => {
    await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: null, status: 'processed', utr: null, failureReason: null });

    expect(mockWithdrawalRepository.findById).not.toHaveBeenCalled();
  });

  it('should warn and no-op when the referenced withdrawal is unknown', async () => {
    mockWithdrawalRepository.findById.mockResolvedValue(null);

    await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'processed', utr: null, failureReason: null });

    expect(mockWithdrawalRepository.update).not.toHaveBeenCalled();
  });

  describe('processed', () => {
    it('should mark the withdrawal PAID and log the status change', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue(withdrawal);

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'processed', utr: 'UTR123', failureReason: null });

      expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', {
        status: 'PAID',
        metadata: { razorpayPayoutId: 'pout_1', utr: 'UTR123' },
      });
      expect(mockWithdrawalRepository.createLog).toHaveBeenCalled();
      expect(mockWalletRepository.reverseFinalizedWithdrawal).not.toHaveBeenCalled();
    });
  });

  describe('failed / reversed', () => {
    it('should reverse the wallet ledger and mark the withdrawal FAILED', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue(withdrawal);

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'failed', utr: null, failureReason: 'insufficient_balance' });

      expect(mockWalletRepository.reverseFinalizedWithdrawal).toHaveBeenCalledWith({
        walletId: 'wallet-1', amount: 1500, withdrawalId: 'withdrawal-1',
      });
      expect(mockWithdrawalRepository.update).toHaveBeenCalledWith('withdrawal-1', {
        status: 'FAILED',
        rejectionReason: 'insufficient_balance',
        metadata: { razorpayPayoutId: 'pout_1' },
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'system', actorType: 'SYSTEM', action: 'STATUS_CHANGE' }),
      );
    });

    it('should not double-reverse a withdrawal already marked PAID', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue({ ...withdrawal, status: 'PAID' });

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'reversed', utr: null, failureReason: null });

      expect(mockWalletRepository.reverseFinalizedWithdrawal).not.toHaveBeenCalled();
      expect(mockWithdrawalRepository.update).not.toHaveBeenCalled();
    });
  });
});
