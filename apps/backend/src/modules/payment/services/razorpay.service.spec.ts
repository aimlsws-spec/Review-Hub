import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PAYMENT_EVENTS } from '../constants';

import { RazorpayService } from './razorpay.service';

const mockOrdersCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockFundAccountCreate = jest.fn();
const mockApiPost = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
    customers: { create: mockCustomersCreate },
    fundAccount: { create: mockFundAccountCreate },
    api: { post: mockApiPost },
  }));
});

jest.mock('razorpay/dist/utils/razorpay-utils', () => ({
  validatePaymentVerification: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RazorpayMock = require('razorpay');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const razorpayUtils = require('razorpay/dist/utils/razorpay-utils');

describe('RazorpayService', () => {
  let service: RazorpayService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, string> = {
        'payment.razorpayKeyId': 'rzp_test_key',
        'payment.razorpayKeySecret': 'test_secret',
        'payment.razorpayWebhookSecret': 'webhook_secret',
        'payment.razorpayXAccountNumber': 'x_account_number',
      };
      return values[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should convert rupees to paise and pass the receipt through', async () => {
      mockOrdersCreate.mockResolvedValue({ id: 'order_123', amount: 500000, currency: 'INR', status: 'created' });

      const result = await service.createOrder(5000, 'receipt-1');

      expect(result).toHaveProperty('id', 'order_123');
      expect(mockOrdersCreate).toHaveBeenCalledWith({ amount: 500000, currency: 'INR', receipt: 'receipt-1' });
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should delegate to validatePaymentVerification with the configured secret', () => {
      razorpayUtils.validatePaymentVerification.mockReturnValue(true);

      const result = service.verifyPaymentSignature('order_1', 'pay_1', 'sig_1');

      expect(result).toBe(true);
      expect(razorpayUtils.validatePaymentVerification).toHaveBeenCalledWith(
        { order_id: 'order_1', payment_id: 'pay_1' },
        'sig_1',
        'test_secret',
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should delegate to the static validateWebhookSignature with the webhook secret', () => {
      RazorpayMock.validateWebhookSignature = jest.fn().mockReturnValue(true);

      const result = service.verifyWebhookSignature('{"event":"payment.captured"}', 'sig_1');

      expect(result).toBe(true);
      expect(RazorpayMock.validateWebhookSignature).toHaveBeenCalledWith('{"event":"payment.captured"}', 'sig_1', 'webhook_secret');
    });
  });

  describe('createCustomer', () => {
    it('should pass name/email/contact through', async () => {
      mockCustomersCreate.mockResolvedValue({ id: 'cust_1' });

      const result = await service.createCustomer({ name: 'Jane Doe' });
      expect(result).toEqual({ id: 'cust_1' });
      expect(mockCustomersCreate).toHaveBeenCalledWith({ name: 'Jane Doe', email: undefined, contact: undefined });
    });
  });

  describe('createFundAccount', () => {
    it('should build the bank_account payload from flat params', async () => {
      mockFundAccountCreate.mockResolvedValue({ id: 'fa_1' });

      const result = await service.createFundAccount({
        customerId: 'cust_1',
        accountHolderName: 'Jane Doe',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0000053',
      });

      expect(result).toEqual({ id: 'fa_1' });
      expect(mockFundAccountCreate).toHaveBeenCalledWith({
        customer_id: 'cust_1',
        account_type: 'bank_account',
        bank_account: { name: 'Jane Doe', account_number: '1234567890', ifsc: 'HDFC0000053' },
      });
    });
  });

  describe('parseWebhookEvent', () => {
    it('should map payment.captured to PAYMENT_CAPTURED', () => {
      const result = service.parseWebhookEvent({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
      });

      expect(result).toEqual({
        name: PAYMENT_EVENTS.PAYMENT_CAPTURED,
        payload: { orderId: 'order_1', paymentId: 'pay_1' },
      });
    });

    it('should return null for payment.captured with no payment entity', () => {
      const result = service.parseWebhookEvent({ event: 'payment.captured', payload: {} });
      expect(result).toBeNull();
    });

    it('should map payout.processed to PAYOUT_STATUS_CHANGED with status "processed"', () => {
      const result = service.parseWebhookEvent({
        event: 'payout.processed',
        payload: { payout: { entity: { id: 'pout_1', reference_id: 'withdrawal-1', utr: 'UTR123', failure_reason: null } } },
      });

      expect(result).toEqual({
        name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
        payload: { payoutId: 'pout_1', referenceId: 'withdrawal-1', status: 'processed', utr: 'UTR123', failureReason: null },
      });
    });

    it('should map payout.failed to PAYOUT_STATUS_CHANGED with status "failed"', () => {
      const result = service.parseWebhookEvent({
        event: 'payout.failed',
        payload: { payout: { entity: { id: 'pout_1', reference_id: 'withdrawal-1', utr: null, failure_reason: 'insufficient_balance' } } },
      });

      expect(result).toMatchObject({ name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED, payload: { status: 'failed' } });
    });

    it('should return null for payout events with no payout entity', () => {
      const result = service.parseWebhookEvent({ event: 'payout.reversed', payload: {} });
      expect(result).toBeNull();
    });

    it('should return null for an unhandled event type', () => {
      const result = service.parseWebhookEvent({ event: 'order.paid', payload: {} });
      expect(result).toBeNull();
    });
  });

  describe('createPayout', () => {
    it('should call the low-level api.post with the payouts endpoint, converting rupees to paise', async () => {
      mockApiPost.mockResolvedValue({ id: 'pout_1', status: 'queued', utr: null });

      const result = await service.createPayout({ fundAccountId: 'fa_1', amountInRupees: 1500, referenceId: 'withdrawal-1' });

      expect(result).toEqual({ id: 'pout_1', status: 'queued', utr: null });
      expect(mockApiPost).toHaveBeenCalledWith({
        url: '/payouts',
        data: expect.objectContaining({
          account_number: 'x_account_number',
          fund_account_id: 'fa_1',
          amount: 150000,
          reference_id: 'withdrawal-1',
        }),
      });
    });
  });
});
