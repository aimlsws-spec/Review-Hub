import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';
import { loadRazorpayFixtures } from './utils/razorpay-fixtures';

/**
 * A payment Razorpay confirms twice (once by the webhook, once by the merchant's own Checkout) must credit the wallet once.
 * The app runs with the mock payment provider here, which accepts any signature; the real signature checks are tested
 * against fixtures in the payment module. What is tested here is what happens after an event is accepted.
 */
describe('Payment webhooks and top-ups (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let merchant: TestMerchant;
  const fixtures = loadRazorpayFixtures();

  const balanceOf = async () => Number((await api.get(`/merchants/${merchant.merchantId}/wallet`, merchant.token).expect(200)).body.data.availableBalance);

  /** Starts a recharge and returns the order it made. */
  const startRecharge = async (amount: number): Promise<string> => {
    const res = await api.post(`/merchants/${merchant.merchantId}/wallet/recharge`, merchant.token).send({ amount }).expect(201);
    return res.body.data.razorpayOrderId;
  };

  /** Razorpay's recorded payment.captured, for a chosen order. The body is text with only the order and payment ids swapped in. */
  const captured = (orderId: string, paymentId: string) =>
    fixtures.body('payment.captured').toString('utf8').replace(fixtures.payment.orderId, orderId).replace(fixtures.payment.paymentId, paymentId);

  const deliver = (body: string) => api.post('/payments/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', fixtures.signature('payment.captured')).send(body);

  /** The webhook is processed after the response is sent, so wait until the balance shows it (or give up). */
  const waitForBalance = async (expected: number, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const balance = await balanceOf();
      if (balance === expected || Date.now() > deadline) return balance;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    merchant = await api.registerApprovedMerchant(await api.adminToken());
  });

  afterAll(async () => {
    await app.close();
  });

  it('credits the wallet when Razorpay reports the payment captured', async () => {
    const before = await balanceOf();
    const orderId = await startRecharge(5000);
    expect(await balanceOf()).toBe(before);

    await deliver(captured(orderId, 'pay_WEBHOOK00001')).expect(200);

    expect(await waitForBalance(before + 5000)).toBe(before + 5000);
  });

  it('credits it once when Razorpay delivers the same webhook again (it retries until it is answered)', async () => {
    const before = await balanceOf();
    const orderId = await startRecharge(2000);

    await deliver(captured(orderId, 'pay_WEBHOOK00002')).expect(200);
    await waitForBalance(before + 2000);
    await deliver(captured(orderId, 'pay_WEBHOOK00002')).expect(200);
    await deliver(captured(orderId, 'pay_WEBHOOK00002')).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await balanceOf()).toBe(before + 2000);
  });

  it('credits it once when the same webhook is delivered several times at the same moment', async () => {
    const before = await balanceOf();
    const orderId = await startRecharge(3000);

    await Promise.all([1, 2, 3, 4, 5].map(() => deliver(captured(orderId, 'pay_WEBHOOK00003'))));
    await waitForBalance(before + 3000);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await balanceOf()).toBe(before + 3000);
    expect(await prisma.walletTransaction.count({ where: { referenceType: 'RazorpayOrder', referenceId: orderId, status: 'SUCCESS' } })).toBe(1);
  });

  it('credits it once when the webhook and the merchant’s own confirmation both arrive', async () => {
    const before = await balanceOf();
    const orderId = await startRecharge(4000);

    await deliver(captured(orderId, 'pay_BOTH0000001')).expect(200);
    await waitForBalance(before + 4000);
    await api
      .post(`/merchants/${merchant.merchantId}/wallet/recharge/verify`, merchant.token)
      .send({ razorpayOrderId: orderId, razorpayPaymentId: 'pay_BOTH0000001', razorpaySignature: 'a'.repeat(64) });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await balanceOf()).toBe(before + 4000);
  });

  it('credits it once when the merchant’s confirmation comes first and the webhook after', async () => {
    const before = await balanceOf();
    const orderId = await startRecharge(1500);

    await api
      .post(`/merchants/${merchant.merchantId}/wallet/recharge/verify`, merchant.token)
      .send({ razorpayOrderId: orderId, razorpayPaymentId: 'pay_FIRST0000001', razorpaySignature: 'a'.repeat(64) });
    await deliver(captured(orderId, 'pay_FIRST0000001')).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await balanceOf()).toBe(before + 1500);
  });

  it('acknowledges a payment for an order nobody here started, and credits nothing', async () => {
    const before = await balanceOf();

    await deliver(captured('order_NOBODYSTARTED1', 'pay_STRANGER00001')).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await balanceOf()).toBe(before);
  });

  it('a webhook with no body signature header is refused', async () => {
    await api.post('/payments/webhooks/razorpay').set('Content-Type', 'application/json').send(fixtures.body('payment.captured').toString('utf8')).expect(400);
  });

  it('acknowledges events it does not act on, and changes nothing', async () => {
    const before = await balanceOf();

    await api
      .post('/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', fixtures.signature('order.paid'))
      .send(fixtures.body('order.paid').toString('utf8'))
      .expect(200);

    expect(await balanceOf()).toBe(before);
  });
});
