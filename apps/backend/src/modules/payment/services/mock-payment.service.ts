import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

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

@Injectable()
export class MockPaymentService implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentService.name);

  async createOrder(amountInRupees: number, receipt: string): Promise<PaymentOrder> {
    this.logger.log(`Mock: Creating order for ₹${amountInRupees} (Receipt: ${receipt})`);
    return {
      id: `mock_order_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
      amount: amountInRupees * 100,
      currency: 'INR',
      receipt,
      status: 'created',
    };
  }

  verifyPaymentSignature(
    _orderId: string,
    _paymentId: string,
    _signature: string,
  ): boolean {
    return true; // Mock always verified
  }

  verifyWebhookSignature(
    _rawBody: string | Buffer,
    _signature: string,
  ): boolean {
    return true; // Mock always verified
  }

  parseWebhookEvent(body: RazorpayWebhookBody): RazorpayWebhookEvent | null {
    this.logger.log(`Mock: Parsing webhook event: ${body.event}`);
    
    // Simulate mapping webhook payload
    if (body.event === 'payment.captured') {
      return {
        name: PAYMENT_EVENTS.PAYMENT_CAPTURED,
        payload: {
          orderId: body.payload.payment?.entity.order_id || 'mock_order',
          paymentId: body.payload.payment?.entity.id || 'mock_payment',
        },
      };
    }

    if (body.event.startsWith('payout.')) {
      const status = body.event.split('.')[1] as PayoutStatusEventPayload['status'];
      return {
        name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
        payload: {
          payoutId: body.payload.payout?.entity.id || 'mock_payout',
          referenceId: body.payload.payout?.entity.reference_id || null,
          status,
          utr: body.payload.payout?.entity.utr || 'mock_utr',
          failureReason: body.payload.payout?.entity.failure_reason || null,
        },
      };
    }

    return null;
  }

  async createCustomer(params: { name: string; email?: string; contact?: string }): Promise<{ id: string }> {
    this.logger.log(`Mock: Creating customer ${params.name}`);
    return { id: `mock_cust_${uuidv4().substring(0, 14)}` };
  }

  async createFundAccount(params: {
    customerId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  }): Promise<PaymentFundAccount> {
    this.logger.log(`Mock: Creating fund account for ${params.accountHolderName}`);
    return { id: `mock_fa_${uuidv4().substring(0, 14)}` };
  }

  async createPayout(params: {
    fundAccountId: string;
    amountInRupees: number;
    referenceId: string;
    narration?: string;
  }): Promise<PaymentPayout> {
    this.logger.log(`Mock: Creating payout to ${params.fundAccountId} for ₹${params.amountInRupees}`);
    
    const payoutId = `mock_pout_${uuidv4().substring(0, 14)}`;

    // Simulate async webhook trigger for successful payout
    setTimeout(() => {
      this.logger.log(`Mock: Simulating Webhook payout.processed for ${payoutId}`);
      try {
        fetch(`http://localhost:${process.env.APP_PORT ?? 3000}/api/v1/payments/webhooks/razorpay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Razorpay-Signature': 'mock_signature', // verifyWebhookSignature returns true in mock
          },
          body: JSON.stringify({
            event: 'payout.processed',
            payload: {
              payout: {
                entity: {
                  id: payoutId,
                  reference_id: params.referenceId,
                  utr: `mock_utr_${uuidv4().substring(0, 8)}`,
                  failure_reason: null,
                }
              }
            }
          }),
        }).catch(err => this.logger.error('Mock webhook error', err));
      } catch (error) {
        this.logger.error(`Mock payout webhook scheduling failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 1000);

    return {
      id: payoutId,
      status: 'processing',
      utr: null,
    };
  }
}
