import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { WithdrawalRepository, WithdrawalSettlementRepository } from '../repositories';

import { PayoutListener } from './payout.listener';

describe('PayoutListener', () => {
  let listener: PayoutListener;

  const mockWithdrawalRepository = { findById: jest.fn() };
  const mockSettlementRepository = { markPaid: jest.fn(), markFailed: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  const withdrawal = { id: 'withdrawal-1', status: 'PROCESSING' };
  const settled = { applied: true, withdrawal: { id: 'withdrawal-1', amount: 1500, wallet: { userId: 'user-1' } } };
  const event = (overrides: Record<string, unknown> = {}) => ({ payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'processed', utr: 'UTR123456789', ...overrides });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutListener,
        { provide: WithdrawalRepository, useValue: mockWithdrawalRepository },
        { provide: WithdrawalSettlementRepository, useValue: mockSettlementRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    listener = module.get(PayoutListener);
    jest.resetAllMocks();
    mockWithdrawalRepository.findById.mockResolvedValue(withdrawal);
  });

  it('ignores a payout report with no reference to a withdrawal', async () => {
    await listener.handlePayoutStatusChanged(event({ referenceId: undefined }) as never);

    expect(mockSettlementRepository.markPaid).not.toHaveBeenCalled();
    expect(mockSettlementRepository.markFailed).not.toHaveBeenCalled();
  });

  it('ignores a payout report for a withdrawal that does not exist', async () => {
    mockWithdrawalRepository.findById.mockResolvedValue(null);

    await listener.handlePayoutStatusChanged(event() as never);

    expect(mockSettlementRepository.markPaid).not.toHaveBeenCalled();
  });

  describe('a payout that went through', () => {
    it('records it as paid by the gateway with its UTR, and tells the user', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue(settled);

      await listener.handlePayoutStatusChanged(event() as never);

      expect(mockSettlementRepository.markPaid).toHaveBeenCalledWith({
        withdrawalId: 'withdrawal-1',
        source: 'GATEWAY',
        reference: 'UTR123456789',
        metadata: { razorpayPayoutId: 'pout_1', utr: 'UTR123456789' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.paid', expect.objectContaining({ userId: 'user-1', amount: 1500, reference: 'UTR123456789' }));
    });

    it('copes with a payout that has no UTR yet', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue(settled);

      await listener.handlePayoutStatusChanged(event({ utr: null }) as never);

      expect(mockSettlementRepository.markPaid).toHaveBeenCalledWith(expect.objectContaining({ reference: undefined, metadata: { razorpayPayoutId: 'pout_1' } }));
    });

    it('says nothing when the same report arrives a second time', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue({ applied: false, reason: 'already_paid', status: 'PAID' });

      await listener.handlePayoutStatusChanged(event() as never);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does not tell the user when it could not be recorded, because the withdrawal is not in a state that allows it', async () => {
      mockSettlementRepository.markPaid.mockResolvedValue({ applied: false, reason: 'unexpected_failed', status: 'FAILED' });

      await listener.handlePayoutStatusChanged(event() as never);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('a payout that failed or was reversed', () => {
    it.each(['failed', 'reversed'])('gives the money back once, with the gateway reason, when it is %s', async (status) => {
      mockSettlementRepository.markFailed.mockResolvedValue(settled);

      await listener.handlePayoutStatusChanged(event({ status, failureReason: 'Beneficiary bank down' }) as never);

      expect(mockSettlementRepository.markFailed).toHaveBeenCalledWith({
        withdrawalId: 'withdrawal-1',
        source: 'GATEWAY',
        reason: 'Beneficiary bank down',
        metadata: { razorpayPayoutId: 'pout_1' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.withdrawal.failed', expect.objectContaining({ userId: 'user-1', amount: 1500, reason: 'Beneficiary bank down' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'SYSTEM', after: { status: 'FAILED', reason: 'Beneficiary bank down' } }));
    });

    it('makes up a reason when the gateway gives none', async () => {
      mockSettlementRepository.markFailed.mockResolvedValue(settled);

      await listener.handlePayoutStatusChanged(event({ status: 'reversed' }) as never);

      expect(mockSettlementRepository.markFailed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Payout reversed by Razorpay' }));
    });

    it('does nothing more when it was already paid or already failed: a repeated report must not return the money twice', async () => {
      mockSettlementRepository.markFailed.mockResolvedValue({ applied: false, reason: 'unexpected_paid', status: 'PAID' });

      await listener.handlePayoutStatusChanged(event({ status: 'failed' }) as never);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });
  });
});
