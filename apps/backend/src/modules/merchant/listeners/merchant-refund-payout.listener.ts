import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { PAYMENT_EVENTS } from '../../payment/constants';
import { PayoutStatusEventPayload } from '../../payment/interfaces';
import { MerchantRefundRepository, MerchantWalletRepository } from '../repositories';

/**
 * The definitive word on whether a RazorpayX merchant refund payout actually
 * moved money. RefundService.initiatePayout() only records that a payout was
 * *requested* — this listener reacts once Razorpay reports what actually
 * happened to it. Shares the same webhook event stream as user withdrawal
 * payouts (see wallet/listeners/payout.listener.ts), so a reference_id that
 * doesn't match a refund request here is expected — it belongs to a user
 * withdrawal instead — not an error.
 */
@Injectable()
export class MerchantRefundPayoutListener {
  private readonly logger = new Logger(MerchantRefundPayoutListener.name);

  constructor(
    private readonly refundRepository: MerchantRefundRepository,
    private readonly walletRepository: MerchantWalletRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  @OnEvent(PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED)
  async handlePayoutStatusChanged(event: PayoutStatusEventPayload) {
    if (!event.referenceId) return;

    const refund = await this.refundRepository.findById(event.referenceId);
    if (!refund) return;

    if (event.status === 'processed') {
      await this.refundRepository.update(refund.id, {
        status: 'PAID',
        metadata: { ...(refund.metadata as object), razorpayPayoutId: event.payoutId, utr: event.utr },
      });
      await this.refundRepository.createLog({
        refund: { connect: { id: refund.id } },
        oldStatus: refund.status,
        newStatus: 'PAID',
        remarks: event.utr ? `UTR: ${event.utr}` : undefined,
      });
      this.logger.log(`Refund ${refund.id} paid out (UTR ${event.utr ?? 'n/a'})`);
      return;
    }

    // failed or reversed — the money never reached the merchant, so give it back.
    if (refund.status === 'PAID') {
      // Already marked paid by an earlier event; don't double-reverse.
      return;
    }

    await this.walletRepository.reverseFinalizedRefund({
      merchantWalletId: refund.merchantWalletId,
      amount: Number(refund.amount),
      refundId: refund.id,
    });

    await this.refundRepository.update(refund.id, {
      status: 'FAILED',
      rejectionReason: event.failureReason ?? `Payout ${event.status} by Razorpay`,
      metadata: { ...(refund.metadata as object), razorpayPayoutId: event.payoutId },
    });

    await this.refundRepository.createLog({
      refund: { connect: { id: refund.id } },
      oldStatus: refund.status,
      newStatus: 'FAILED',
      remarks: event.failureReason ?? `Payout ${event.status} by Razorpay`,
    });

    await this.auditLogService.record({
      actorId: 'system',
      actorType: 'SYSTEM',
      entity: 'MerchantRefundRequest',
      entityId: refund.id,
      action: 'STATUS_CHANGE',
      before: { status: refund.status },
      after: { status: 'FAILED', reason: event.failureReason },
    });

    this.logger.warn(`Refund ${refund.id} payout ${event.status} — reversed the ledger`);
  }
}
