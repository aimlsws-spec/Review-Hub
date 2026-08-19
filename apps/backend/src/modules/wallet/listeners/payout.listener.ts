import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { PAYMENT_EVENTS } from '../../payment/constants';
import { PayoutStatusEventPayload } from '../../payment/interfaces';
import { UserWalletRepository, WithdrawalRepository } from '../repositories';

/**
 * The definitive word on whether a RazorpayX payout actually moved money.
 * `WithdrawalService.initiatePayout()` only records that a payout was
 * *requested* — this listener reacts once Razorpay reports what actually
 * happened to it.
 */
@Injectable()
export class PayoutListener {
  private readonly logger = new Logger(PayoutListener.name);

  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly auditLogService: AuditLogService,
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
      await this.withdrawalRepository.update(withdrawal.id, {
        status: 'PAID',
        metadata: { ...(withdrawal.metadata as object), razorpayPayoutId: event.payoutId, utr: event.utr },
      });
      await this.withdrawalRepository.createLog({
        withdrawal: { connect: { id: withdrawal.id } },
        oldStatus: withdrawal.status,
        newStatus: 'PAID',
        remarks: event.utr ? `UTR: ${event.utr}` : undefined,
      });
      this.logger.log(`Withdrawal ${withdrawal.id} paid out (UTR ${event.utr ?? 'n/a'})`);
      return;
    }

    // failed or reversed — the money never reached the user, so give it back.
    if (withdrawal.status === 'PAID') {
      // Already marked paid by an earlier event; don't double-reverse.
      return;
    }

    await this.walletRepository.reverseFinalizedWithdrawal({
      walletId: withdrawal.walletId,
      amount: Number(withdrawal.amount),
      withdrawalId: withdrawal.id,
    });

    await this.withdrawalRepository.update(withdrawal.id, {
      status: 'FAILED',
      rejectionReason: event.failureReason ?? `Payout ${event.status} by Razorpay`,
      metadata: { ...(withdrawal.metadata as object), razorpayPayoutId: event.payoutId },
    });

    await this.withdrawalRepository.createLog({
      withdrawal: { connect: { id: withdrawal.id } },
      oldStatus: withdrawal.status,
      newStatus: 'FAILED',
      remarks: event.failureReason ?? `Payout ${event.status} by Razorpay`,
    });

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
