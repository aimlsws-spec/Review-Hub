import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');

import { PAYMENT_EVENTS } from '../constants';
import {
  PaymentFundAccount,
  PaymentOrder,
  PaymentPayout,
  PaymentProvider,
  PayoutStatusEventPayload,
  RazorpayWebhookBody,
  RazorpayWebhookEvent,
} from '../interfaces';
import { signatureMatches } from '../utils/hmac';

/**
 * Thin wrapper around the Razorpay SDK. RazorpayX (payouts/fund accounts) isn't
 * part of this SDK version's typed surface, so those calls go through the
 * generic `api` HTTP client instead of a dedicated resource property.
 */
@Injectable()
export class RazorpayService implements PaymentProvider {
  private readonly logger = new Logger(RazorpayService.name);
  private _client: Razorpay | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Constructed lazily, not in the constructor — the Razorpay SDK throws
   * synchronously if `key_id`/`key_secret` are blank, which would otherwise
   * crash the whole app at boot whenever Razorpay isn't configured. Deferring
   * construction lets the app run normally until a payment feature is
   * actually used, matching every other optional integration's documented
   * "degrades gracefully when unconfigured" behavior.
   */
  private get client(): Razorpay {
    if (!this._client) {
      const key_id = this.config.get<string>('payment.razorpayKeyId');
      const key_secret = this.config.get<string>('payment.razorpayKeySecret');
      if (!key_id || !key_secret) {
        throw new Error('Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to use payment features.');
      }
      this._client = new Razorpay({ key_id, key_secret });
    }
    return this._client;
  }

  /** Creates a collection order for a wallet top-up. Amount is in rupees. */
  async createOrder(amountInRupees: number, receipt: string): Promise<PaymentOrder> {
    const order = await this.client.orders.create({
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt,
    });
    return order as unknown as PaymentOrder;
  }

  /**
   * Verifies the signature Razorpay Checkout returns to the client on successful payment: HMAC-SHA256 of
   * `order_id|payment_id` under the key secret. Fails closed: with no key secret configured nothing verifies.
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = this.config.get<string>('payment.razorpayKeySecret', '');
    if (!secret) this.logger.error('RAZORPAY_KEY_SECRET is not set, so no payment signature can be verified');
    return signatureMatches(`${orderId}|${paymentId}`, signature, secret);
  }

  /**
   * Verifies the `X-Razorpay-Signature` header on an incoming webhook against the raw request body, byte for byte.
   * Fails closed: with no webhook secret configured, every webhook is refused. (Razorpay's own helper accepts a signature
   * made with an empty secret, which anyone can make, so this endpoint would have trusted any caller.)
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const secret = this.config.get<string>('payment.razorpayWebhookSecret', '');
    if (!secret) this.logger.error('RAZORPAY_WEBHOOK_SECRET is not set, so every webhook is being refused');
    return signatureMatches(rawBody, signature, secret);
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
  }): Promise<PaymentFundAccount> {
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
  async createPayout(params: { fundAccountId: string; amountInRupees: number; referenceId: string; narration?: string }): Promise<PaymentPayout> {
    const accountNumber = this.config.get<string>('payment.razorpayXAccountNumber');
    return this.client.api.post<Record<string, unknown>, PaymentPayout>({
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
