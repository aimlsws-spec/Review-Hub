import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantRefundRepository, MerchantWalletRepository } from '../repositories';

import { MerchantRefundPayoutListener } from './merchant-refund-payout.listener';

describe('MerchantRefundPayoutListener', () => {
  let listener: MerchantRefundPayoutListener;

  const mockRefundRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    createLog: jest.fn(),
  };
  const mockWalletRepository = {
    reverseFinalizedRefund: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  const refund = {
    id: 'refund-1',
    merchantWalletId: 'wallet-1',
    amount: 1500,
    status: 'PROCESSING',
    metadata: { razorpayPayoutId: 'pout_1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRefundPayoutListener,
        { provide: MerchantRefundRepository, useValue: mockRefundRepository },
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    listener = module.get<MerchantRefundPayoutListener>(MerchantRefundPayoutListener);
    jest.clearAllMocks();
  });

  it('should no-op silently when the event has no referenceId', async () => {
    await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: null, status: 'processed', utr: null, failureReason: null });

    expect(mockRefundRepository.findById).not.toHaveBeenCalled();
  });

  it('should no-op silently when the referenceId belongs to a user withdrawal, not a refund', async () => {
    mockRefundRepository.findById.mockResolvedValue(null);

    await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'processed', utr: null, failureReason: null });

    expect(mockRefundRepository.update).not.toHaveBeenCalled();
  });

  describe('processed', () => {
    it('should mark the refund PAID and log the status change', async () => {
      mockRefundRepository.findById.mockResolvedValue(refund);

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'refund-1', status: 'processed', utr: 'UTR123', failureReason: null });

      expect(mockRefundRepository.update).toHaveBeenCalledWith('refund-1', {
        status: 'PAID',
        metadata: { razorpayPayoutId: 'pout_1', utr: 'UTR123' },
      });
      expect(mockRefundRepository.createLog).toHaveBeenCalled();
      expect(mockWalletRepository.reverseFinalizedRefund).not.toHaveBeenCalled();
    });
  });

  describe('failed / reversed', () => {
    it('should reverse the wallet ledger and mark the refund FAILED', async () => {
      mockRefundRepository.findById.mockResolvedValue(refund);

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'refund-1', status: 'failed', utr: null, failureReason: 'insufficient_balance' });

      expect(mockWalletRepository.reverseFinalizedRefund).toHaveBeenCalledWith({
        merchantWalletId: 'wallet-1', amount: 1500, refundId: 'refund-1',
      });
      expect(mockRefundRepository.update).toHaveBeenCalledWith('refund-1', {
        status: 'FAILED',
        rejectionReason: 'insufficient_balance',
        metadata: { razorpayPayoutId: 'pout_1' },
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'system', actorType: 'SYSTEM', action: 'STATUS_CHANGE' }),
      );
    });

    it('should not double-reverse a refund already marked PAID', async () => {
      mockRefundRepository.findById.mockResolvedValue({ ...refund, status: 'PAID' });

      await listener.handlePayoutStatusChanged({ payoutId: 'pout_1', referenceId: 'refund-1', status: 'reversed', utr: null, failureReason: null });

      expect(mockWalletRepository.reverseFinalizedRefund).not.toHaveBeenCalled();
      expect(mockRefundRepository.update).not.toHaveBeenCalled();
    });
  });
});
