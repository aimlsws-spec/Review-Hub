import type { RazorpayWebhookBody, RazorpayWebhookEvent } from './index';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export interface PaymentFundAccount {
  id: string;
}

export interface PaymentPayout {
  id: string;
  status: string;
  utr: string | null;
}

export interface PaymentProvider {
  createOrder(amountInRupees: number, receipt: string): Promise<PaymentOrder>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
  parseWebhookEvent(body: RazorpayWebhookBody): RazorpayWebhookEvent | null;
  createCustomer(params: { name: string; email?: string; contact?: string }): Promise<{ id: string }>;
  createFundAccount(params: {
    customerId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  }): Promise<PaymentFundAccount>;
  createPayout(params: {
    fundAccountId: string;
    amountInRupees: number;
    referenceId: string;
    narration?: string;
  }): Promise<PaymentPayout>;
}
