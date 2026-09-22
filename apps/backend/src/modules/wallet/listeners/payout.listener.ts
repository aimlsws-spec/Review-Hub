import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { PAYMENT_EVENTS } from '../../payment/constants';
import { PayoutStatusEventPayload } from '../../payment/interfaces';
import { WithdrawalFailedEvent, WithdrawalPaidEvent } from '../events';
import { WithdrawalRepository, WithdrawalSettlementRepository } from '../repositories';

/**
 * The definitive word on whether a RazorpayX payout actually moved money.
 * `WithdrawalService.initiatePayout()` only records that a payout was
 * *requested* — this listener reacts once Razorpay reports what actually
 * happened to it.
 *
 * Settling goes through WithdrawalSettlementRepository, which locks the withdrawal first: the same report arriving
 * twice, or arriving while an admin is settling it, changes the ledger once and only once.
 */
@Injectable()
export class PayoutListener {
  private readonly logger = new Logger(PayoutListener.name);

  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly settlementRepository: WithdrawalSettlementRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED)
  async handlePayoutStatusChanged(event: PayoutStatusEventPayload) {
    if (!event.referenceId) {
      this.logger.warn(`Payout ${event.payoutId} has no reference_id — cannot match it to a withdrawal`);
      return;
    }

    const withdrawal = await this.withdrawalRepository.findById(event.referenceId);
    if (!withdrawal) {
      this.logger.warn(`Payout webhook referenced unknown withdrawal ${event.referenceId}`);
      return;
    }

    if (event.status === 'processed') {
      const outcome = await this.settlementRepository.markPaid({
        withdrawalId: withdrawal.id,
        source: 'GATEWAY',
        reference: event.utr ?? undefined,
        metadata: { razorpayPayoutId: event.payoutId, ...(event.utr ? { utr: event.utr } : {}) },
      });

      if (outcome.applied) {
        this.eventEmitter.emit(
          'wallet.withdrawal.paid',
          new WithdrawalPaidEvent(withdrawal.id, outcome.withdrawal.wallet.userId, Number(outcome.withdrawal.amount), event.utr ?? undefined),
        );
        this.logger.log(`Withdrawal ${withdrawal.id} paid out (UTR ${event.utr ?? 'n/a'})`);
      } else if (outcome.reason !== 'already_paid') {
        // Paid by the gateway but not in a state where that can be recorded (for example already returned to the
        // user). Money and ledger now disagree, so it needs a person.
        this.logger.error(`Gateway reports withdrawal ${withdrawal.id} paid but it is ${outcome.status}. Check it by hand.`);
      }
      return;
    }

    // failed or reversed — the money never reached the user, so give it back.
    const reason = event.failureReason ?? `Payout ${event.status} by Razorpay`;
    const outcome = await this.settlementRepository.markFailed({
      withdrawalId: withdrawal.id,
      source: 'GATEWAY',
      reason,
      metadata: { razorpayPayoutId: event.payoutId },
    });
    if (!outcome.applied) {
      // Already paid or already failed: a repeat of an earlier report. Nothing to undo twice.
      return;
    }

    this.eventEmitter.emit(
      'wallet.withdrawal.failed',
      new WithdrawalFailedEvent(withdrawal.id, outcome.withdrawal.wallet.userId, Number(outcome.withdrawal.amount), reason),
    );
    await this.auditLogService.record({
      actorId: 'system',
      actorType: 'SYSTEM',
      entity: 'WithdrawalRequest',
      entityId: withdrawal.id,
      action: 'STATUS_CHANGE',
      before: { status: withdrawal.status },
      after: { status: 'FAILED', reason: event.failureReason },
    });

    this.logger.warn(`Withdrawal ${withdrawal.id} payout ${event.status} — reversed the ledger`);
  }
}
