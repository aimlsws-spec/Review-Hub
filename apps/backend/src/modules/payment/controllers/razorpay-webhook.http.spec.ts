import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { loadRazorpayFixtures } from '../../../../test/utils/razorpay-fixtures';
import { PAYMENT_EVENTS } from '../constants';
import { PAYMENT_PROVIDER } from '../interfaces';
import { RazorpayService } from '../services/razorpay.service';
import { hmacSha256Hex } from '../utils/hmac';

import { RazorpayWebhookController } from './razorpay-webhook.controller';

/**
 * The webhook endpoint over real HTTP, with the real signature check and Razorpay's recorded-shape payloads. The point of
 * going over HTTP is the raw body: the signature is over the bytes as they arrive, and a JSON body that was parsed and
 * written out again is not those bytes.
 */
describe('Razorpay webhook over HTTP (fixtures)', () => {
  const fixtures = loadRazorpayFixtures();
  const URL = '/payments/webhooks/razorpay';
  const SIGNATURE_HEADER = 'X-Razorpay-Signature';

  let app: INestApplication;
  let emitted: { name: string; payload: unknown }[];

  async function start(config: Record<string, string>) {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot({ wildcard: false })],
      controllers: [RazorpayWebhookController],
      providers: [
        RazorpayService,
        { provide: PAYMENT_PROVIDER, useExisting: RazorpayService },
        { provide: ConfigService, useValue: { get: (key: string, fallback?: unknown) => config[key] ?? fallback } },
      ],
    }).compile();

    // The same switch main.ts turns on for the real app, and the reason this test is over HTTP.
    const created = module.createNestApplication({ rawBody: true });
    await created.init();

    emitted = [];
    const emitter = created.get(EventEmitter2);
    for (const name of Object.values(PAYMENT_EVENTS)) emitter.on(name, (payload: unknown) => emitted.push({ name, payload }));
    return created;
  }

  const post = (body: Buffer | string, signature?: string) => {
    const req = request(app.getHttpServer()).post(URL).set('Content-Type', 'application/json');
    // Sent as text: given a Buffer, the HTTP client would write it out as JSON, a different set of bytes from the recorded ones.
    return (signature ? req.set(SIGNATURE_HEADER, signature) : req).send(typeof body === 'string' ? body : body.toString('utf8'));
  };

  describe('configured', () => {
    beforeAll(async () => {
      app = await start({ 'payment.razorpayWebhookSecret': fixtures.webhookSecret, 'payment.razorpayKeySecret': fixtures.keySecret });
    });
    beforeEach(() => {
      emitted = [];
    });
    afterAll(async () => {
      await app.close();
    });

    it('accepts a recorded captured payment, and raises the event for the order and payment', async () => {
      const res = await post(fixtures.body('payment.captured'), fixtures.signature('payment.captured')).expect(200);

      expect(res.body).toEqual({ received: true });
      expect(emitted).toEqual([{ name: PAYMENT_EVENTS.PAYMENT_CAPTURED, payload: { orderId: fixtures.payment.orderId, paymentId: fixtures.payment.paymentId } }]);
    });

    it.each([
      ['payout.processed', 'processed', 'HDFCN12345678901'],
      ['payout.failed', 'failed', null],
      ['payout.reversed', 'reversed', 'HDFCN12345678901'],
    ])('accepts a recorded %s and raises a payout event for the right withdrawal', async (name, status, utr) => {
      await post(fixtures.body(name), fixtures.signature(name)).expect(200);

      expect(emitted).toEqual([
        { name: PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED, payload: expect.objectContaining({ referenceId: fixtures.withdrawalId, status, utr }) },
      ]);
    });

    it.each(['order.paid', 'payment.failed'])('acknowledges %s but does nothing with it', async (name) => {
      await post(fixtures.body(name), fixtures.signature(name)).expect(200);
      expect(emitted).toEqual([]);
    });

    it('acknowledges a signed payout event with no payout in it, and does nothing', async () => {
      await post(fixtures.body('payout.processed.no-entity'), fixtures.signature('payout.processed.no-entity')).expect(200);
      expect(emitted).toEqual([]);
    });

    it('refuses a request with no signature, and raises nothing', async () => {
      await post(fixtures.body('payment.captured')).expect(400);
      expect(emitted).toEqual([]);
    });

    it('refuses a wrong signature, and raises nothing', async () => {
      await post(fixtures.body('payment.captured'), 'f'.repeat(64)).expect(400);
      await post(fixtures.body('payment.captured'), 'not-a-signature').expect(400);
      expect(emitted).toEqual([]);
    });

    it('refuses a signature made with the wrong secret', async () => {
      await post(fixtures.body('payment.captured'), hmacSha256Hex(fixtures.body('payment.captured'), 'someone-elses-secret')).expect(400);
      expect(emitted).toEqual([]);
    });

    it('refuses a signed body that was changed on the way: a failed payout turned into a processed one', async () => {
      const tampered = fixtures.body('payout.failed').toString('utf8').replace('"status": "failed"', '"status": "processed"');

      await post(tampered, fixtures.signature('payout.failed')).expect(400);

      expect(emitted).toEqual([]);
    });

    it('refuses a signature that belongs to another event', async () => {
      await post(fixtures.body('payout.failed'), fixtures.signature('payout.processed')).expect(400);
      expect(emitted).toEqual([]);
    });

    it('refuses the same payload written out again by a JSON library: the signature is over the bytes, not the meaning', async () => {
      const parsed = JSON.parse(fixtures.body('payment.captured').toString('utf8'));

      // supertest writes an object as compact JSON, which is not the recorded bytes.
      await request(app.getHttpServer()).post(URL).set(SIGNATURE_HEADER, fixtures.signature('payment.captured')).send(parsed).expect(400);

      expect(emitted).toEqual([]);
    });

    it('refuses a body that is not JSON, even with a signature that is right for it', async () => {
      const junk = 'this is not json';
      await post(junk, hmacSha256Hex(junk, fixtures.webhookSecret)).expect(400);
      expect(emitted).toEqual([]);
    });

    it('needs no login: Razorpay calls it directly', async () => {
      await post(fixtures.body('order.paid'), fixtures.signature('order.paid')).expect(200);
    });

    it('raises the event each time the same webhook is delivered again: Razorpay retries, and whatever listens must not pay twice', async () => {
      await post(fixtures.body('payment.captured'), fixtures.signature('payment.captured')).expect(200);
      await post(fixtures.body('payment.captured'), fixtures.signature('payment.captured')).expect(200);

      expect(emitted).toHaveLength(2);
    });
  });

  describe('with no webhook secret configured', () => {
    beforeAll(async () => {
      app = await start({ 'payment.razorpayKeySecret': fixtures.keySecret });
    });
    beforeEach(() => {
      emitted = [];
    });
    afterAll(async () => {
      await app.close();
    });

    it('refuses everything, including a webhook signed with an empty secret, which anyone could make', async () => {
      await post(fixtures.body('payment.captured'), hmacSha256Hex(fixtures.body('payment.captured'), '')).expect(400);
      await post(fixtures.body('payout.failed'), hmacSha256Hex(fixtures.body('payout.failed'), '')).expect(400);
      await post(fixtures.body('payment.captured'), fixtures.signature('payment.captured')).expect(400);

      expect(emitted).toEqual([]);
    });
  });
});
