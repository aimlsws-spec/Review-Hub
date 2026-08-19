import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PAYMENT_EVENTS } from '../../payment/constants';
import { PaymentCapturedEventPayload } from '../../payment/interfaces';
import { MerchantWalletRepository } from '../repositories';

/**
 * Durable backup for merchant wallet top-up confirmation. The client also
 * calls a verify endpoint right after Razorpay Checkout succeeds, which does
 * the same confirmation — this listener exists for the case that call never
 * arrives (closed tab, network drop). confirmTopUp() is idempotent either way.
 */
@Injectable()
export class MerchantWalletListener {
  private readonly logger = new Logger(MerchantWalletListener.name);

  constructor(private readonly walletRepository: MerchantWalletRepository) {}

  @OnEvent(PAYMENT_EVENTS.PAYMENT_CAPTURED)
  async handlePaymentCaptured(payload: PaymentCapturedEventPayload) {
    const pending = await this.walletRepository.findPendingTopUpByOrderId(payload.orderId);
    if (!pending) {
      // Not every captured payment is a wallet recharge — nothing pending for this order is expected, not an error.
      return;
    }

    await this.walletRepository.confirmTopUp(pending.id, payload.paymentId);
    this.logger.log(`Confirmed wallet top-up for order ${payload.orderId} via webhook`);
  }
}
