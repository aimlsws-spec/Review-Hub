import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';

import { PAYMENT_EVENTS } from '../constants';
import { PayoutStatusEventPayload, RazorpayWebhookBody, RazorpayWebhookEvent } from '../interfaces';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export interface RazorpayFundAccount {
  id: string;
}

export interface RazorpayPayout {
  id: string;
  status: string;
  utr: string | null;
}

/**
 * Thin wrapper around the Razorpay SDK. RazorpayX (payouts/fund accounts) isn't
 * part of this SDK version's typed surface, so those calls go through the
 * generic `api` HTTP client instead of a dedicated resource property.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly client: Razorpay;

  constructor(private readonly config: ConfigService) {
    this.client = new Razorpay({
      key_id: this.config.get<string>('payment.razorpayKeyId'),
      key_secret: this.config.get<string>('payment.razorpayKeySecret'),
    });
  }

  /** Creates a collection order for a wallet top-up. Amount is in rupees. */
  async createOrder(amountInRupees: number, receipt: string): Promise<RazorpayOrder> {
    const order = await this.client.orders.create({
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt,
    });
    return order as unknown as RazorpayOrder;
  }

  /** Verifies the signature Razorpay Checkout returns to the client on successful payment. */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = this.config.get<string>('payment.razorpayKeySecret', '');
    return validatePaymentVerification({ order_id: orderId, payment_id: paymentId }, signature, secret);
  }

  /** Verifies the `X-Razorpay-Signature` header on an incoming webhook against the raw request body. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get<string>('payment.razorpayWebhookSecret', '');
    return Razorpay.validateWebhookSignature(rawBody, signature, secret);
  }

  /**
   * Maps a verified Razorpay webhook payload to the internal domain event it
   * should raise. Returns null for event types we don't act on (or whose
   * expected entity is missing from the payload), in which case the caller
   * emits nothing.
   */
  parseWebhookEvent(body: RazorpayWebhookBody): RazorpayWebhookEvent | null {
    switch (body.event) {
      case 'payment.captured': {
        const payment = body.payload.payment?.entity;
        if (!payment) return null;
        return {
          name: PAYMENT_EVENTS.PAYMENT_CAPTURED,
          payload: { orderId: payment.order_id, paymentId: payment.id },
        };
      }
      case 'payout.processed':
      case 'payout.failed':
      case 'payout.reversed': {
        const payout = body.payload.payout?.entity;
        if (!payout) return null;
        const status = body.event.split('.')[1] as PayoutStatusEventPayload['status'];
        return {
          name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
          payload: {
            payoutId: payout.id,
            referenceId: payout.reference_id,
            status,
            utr: payout.utr,
            failureReason: payout.failure_reason,
          },
        };
      }
      default:
        this.logger.debug(`Unhandled Razorpay webhook event: ${body.event}`);
        return null;
    }
  }

  /** RazorpayX: a Customer entity a payout's fund account attaches to. Safe to call repeatedly — Razorpay does not require uniqueness. */
  async createCustomer(params: { name: string; email?: string; contact?: string }): Promise<{ id: string }> {
    return this.client.customers.create({ name: params.name, email: params.email, contact: params.contact });
  }

  /** RazorpayX: registers a bank account as a payout destination for a customer. */
  async createFundAccount(params: {
    customerId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  }): Promise<RazorpayFundAccount> {
    return this.client.fundAccount.create({
      customer_id: params.customerId,
      account_type: 'bank_account',
      bank_account: {
        name: params.accountHolderName,
        account_number: params.accountNumber,
        ifsc: params.ifscCode,
      },
    });
  }

  /** RazorpayX: initiates the actual payout. Requires RAZORPAY_X_ACCOUNT_NUMBER (the RazorpayX virtual account funds are drawn from). */
  async createPayout(params: { fundAccountId: string; amountInRupees: number; referenceId: string; narration?: string }): Promise<RazorpayPayout> {
    const accountNumber = this.config.get<string>('payment.razorpayXAccountNumber');
    return this.client.api.post<Record<string, unknown>, RazorpayPayout>({
      url: '/payouts',
      data: {
        account_number: accountNumber,
        fund_account_id: params.fundAccountId,
        amount: Math.round(params.amountInRupees * 100),
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: params.referenceId,
        narration: params.narration ?? 'Withdrawal payout',
      },
    });
  }
}
