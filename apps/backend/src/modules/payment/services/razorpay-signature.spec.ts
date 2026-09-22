import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';

import { loadRazorpayFixtures } from '../../../../test/utils/razorpay-fixtures';
import { PAYMENT_EVENTS } from '../constants';
import { RazorpayWebhookBody } from '../interfaces';
import { hmacSha256Hex } from '../utils/hmac';

import { RazorpayService } from './razorpay.service';

/**
 * Razorpay signatures, checked against fixtures and against Razorpay's own SDK. Nothing here is mocked: real HMAC, real
 * bytes. The stored signatures were made separately from the code under test, and the SDK is used as a second opinion,
 * so a verifier that is wrong but consistent with itself can not pass.
 */
describe('Razorpay signatures (fixtures)', () => {
  const fixtures = loadRazorpayFixtures();

  const serviceWith = (config: Record<string, string>) =>
    new RazorpayService({ get: (key: string, fallback?: unknown) => config[key] ?? fallback } as unknown as ConfigService);
  const configured = { 'payment.razorpayWebhookSecret': fixtures.webhookSecret, 'payment.razorpayKeySecret': fixtures.keySecret };
  const service = serviceWith(configured);

  describe('webhooks', () => {
    it.each(fixtures.names)('accepts the recorded %s webhook with its recorded signature', (name) => {
      expect(service.verifyWebhookSignature(fixtures.body(name), fixtures.signature(name))).toBe(true);
    });

    it.each(fixtures.names)('agrees with Razorpay’s own SDK on %s', (name) => {
      const raw = fixtures.body(name).toString('utf8');
      expect(Razorpay.validateWebhookSignature(raw, fixtures.signature(name), fixtures.webhookSecret)).toBe(true);
      expect(service.verifyWebhookSignature(raw, fixtures.signature(name))).toBe(true);
    });

    it('is a signature over exactly the recorded bytes: the stored value is what an independent HMAC gives', () => {
      expect(hmacSha256Hex(fixtures.body('payment.captured'), fixtures.webhookSecret)).toBe(fixtures.signature('payment.captured'));
    });

    it('refuses a signature that belongs to a different event', () => {
      expect(service.verifyWebhookSignature(fixtures.body('payout.failed'), fixtures.signature('payout.processed'))).toBe(false);
    });

    describe('a body that has been tampered with', () => {
      const tamper = (name: string, change: (text: string) => string) => Buffer.from(change(fixtures.body(name).toString('utf8')), 'utf8');

      it('refuses a payment whose amount was raised', () => {
        const body = tamper('payment.captured', (t) => t.replace('"amount": 500000', '"amount": 5000000'));
        expect(service.verifyWebhookSignature(body, fixtures.signature('payment.captured'))).toBe(false);
      });

      it('refuses a payout whose status was changed from failed to processed', () => {
        const body = tamper('payout.failed', (t) => t.replace('"status": "failed"', '"status": "processed"').replace('payout.failed', 'payout.processed'));
        expect(service.verifyWebhookSignature(body, fixtures.signature('payout.failed'))).toBe(false);
      });

      it('refuses a payout pointed at a different withdrawal', () => {
        const body = tamper('payout.processed', (t) => t.replace(fixtures.withdrawalId, '00000000-0000-4000-8000-000000000000'));
        expect(service.verifyWebhookSignature(body, fixtures.signature('payout.processed'))).toBe(false);
      });

      it('refuses the same JSON written with different spacing: the signature is over the bytes, not the meaning', () => {
        const reformatted = JSON.stringify(JSON.parse(fixtures.body('payment.captured').toString('utf8')));
        expect(service.verifyWebhookSignature(reformatted, fixtures.signature('payment.captured'))).toBe(false);
      });

      it('refuses a body with the line ending changed, which is what a careless checkout would do to a fixture', () => {
        const crlf = fixtures.body('payment.captured').toString('utf8').replace(/\n/g, '\r\n');
        expect(service.verifyWebhookSignature(crlf, fixtures.signature('payment.captured'))).toBe(false);
      });

      it('refuses an empty body and a truncated one', () => {
        expect(service.verifyWebhookSignature('', fixtures.signature('payment.captured'))).toBe(false);
        expect(service.verifyWebhookSignature(fixtures.body('payment.captured').subarray(0, 100), fixtures.signature('payment.captured'))).toBe(false);
      });
    });

    describe('a signature that is not right', () => {
      it.each([
        ['missing', undefined],
        ['empty', ''],
        ['too short', 'abc123'],
        ['not hex', 'g'.repeat(64)],
        ['made with another secret', hmacSha256Hex(fixtures.body('payment.captured'), 'not-the-secret')],
        ['made with the KEY secret instead of the webhook secret', hmacSha256Hex(fixtures.body('payment.captured'), fixtures.keySecret)],
      ])('is refused when it is %s', (_label, signature) => {
        expect(service.verifyWebhookSignature(fixtures.body('payment.captured'), signature as string)).toBe(false);
      });
    });

    describe('when no webhook secret is configured', () => {
      const unconfigured = serviceWith({ 'payment.razorpayKeySecret': fixtures.keySecret });

      it('refuses every webhook, including one signed with an empty secret that anyone could forge', () => {
        const forged = hmacSha256Hex(fixtures.body('payment.captured'), '');

        expect(unconfigured.verifyWebhookSignature(fixtures.body('payment.captured'), forged)).toBe(false);
        expect(unconfigured.verifyWebhookSignature(fixtures.body('payment.captured'), fixtures.signature('payment.captured'))).toBe(false);
      });

      it('shows why: Razorpay’s own helper accepts that forged signature', () => {
        // Kept as a test on purpose. If a newer SDK stops doing this, it can be dropped; until then it is the reason the
        // verification is done here and not delegated.
        const forged = hmacSha256Hex(fixtures.body('payment.captured'), '');
        expect(Razorpay.validateWebhookSignature(fixtures.body('payment.captured').toString('utf8'), forged, '')).toBe(true);
      });
    });
  });

  describe('a payment confirmed by Checkout', () => {
    const { orderId, paymentId, signature } = fixtures.payment;

    it('accepts the recorded signature', () => {
      expect(service.verifyPaymentSignature(orderId, paymentId, signature)).toBe(true);
    });

    it('agrees with Razorpay’s own SDK', () => {
      expect(validatePaymentVerification({ order_id: orderId, payment_id: paymentId }, signature, fixtures.keySecret)).toBe(true);
    });

    it.each([
      ['another order', 'order_OTHER00000001', paymentId],
      ['another payment', orderId, 'pay_OTHER000000001'],
      ['the two swapped', paymentId, orderId],
    ])('refuses the signature for %s', (_label, order, payment) => {
      expect(service.verifyPaymentSignature(order, payment, signature)).toBe(false);
    });

    it('is made over order|payment with the KEY secret, not the webhook secret', () => {
      expect(service.verifyPaymentSignature(orderId, paymentId, hmacSha256Hex(`${orderId}|${paymentId}`, fixtures.webhookSecret))).toBe(false);
    });

    it('refuses everything, without throwing, when no key secret is configured', () => {
      const unconfigured = serviceWith({});
      expect(() => unconfigured.verifyPaymentSignature(orderId, paymentId, hmacSha256Hex(`${orderId}|${paymentId}`, ''))).not.toThrow();
      expect(unconfigured.verifyPaymentSignature(orderId, paymentId, hmacSha256Hex(`${orderId}|${paymentId}`, ''))).toBe(false);
    });
  });

  describe('what each recorded event becomes', () => {
    const parse = (name: string) => service.parseWebhookEvent(JSON.parse(fixtures.body(name).toString('utf8')) as RazorpayWebhookBody);

    it('a captured payment becomes the order and payment that were paid', () => {
      expect(parse('payment.captured')).toEqual({
        name: PAYMENT_EVENTS.PAYMENT_CAPTURED,
        payload: { orderId: fixtures.payment.orderId, paymentId: fixtures.payment.paymentId },
      });
    });

    it('a processed payout becomes a paid withdrawal with the bank’s UTR', () => {
      expect(parse('payout.processed')).toEqual({
        name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
        payload: { payoutId: 'pout_Bx3wwbgtYpbrBK', referenceId: fixtures.withdrawalId, status: 'processed', utr: 'HDFCN12345678901', failureReason: null },
      });
    });

    it('a failed payout carries the reason and no UTR', () => {
      expect(parse('payout.failed')).toEqual({
        name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
        payload: expect.objectContaining({ status: 'failed', utr: null, failureReason: 'Beneficiary bank is offline', referenceId: fixtures.withdrawalId }),
      });
    });

    it('a reversed payout is reported as reversed', () => {
      expect(parse('payout.reversed')).toEqual({
        name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED,
        payload: expect.objectContaining({ status: 'reversed', failureReason: 'Reversed by the beneficiary bank' }),
      });
    });

    it.each(['order.paid', 'payment.failed'])('%s is not acted on', (name) => {
      expect(parse(name)).toBeNull();
    });

    it('a payout event with no payout in it is not acted on, rather than crashing', () => {
      expect(parse('payout.processed.no-entity')).toBeNull();
    });
  });
});
