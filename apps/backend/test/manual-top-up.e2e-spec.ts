import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * An admin adds money to a merchant wallet after a bank transfer. This is real money moving on one person's word, so
 * the tests are about what must not happen: crediting the same transfer twice (even at the same moment), crediting
 * by anyone but an admin, and crediting a merchant who is not active.
 */
describe('Manual wallet top-up (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;

  let referenceCounter = 0;
  const reference = () => `E2EUTR${Date.now()}${(referenceCounter += 1)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const body = (overrides: Record<string, unknown> = {}) => ({ amount: 5000, bankReference: reference(), receivedOn: today(), ...overrides });
  const topUpUrl = (merchantId = merchant.merchantId) => `/admin/merchants/${merchantId}/wallet/top-ups`;

  const balanceOf = async (target: TestMerchant = merchant) => {
    const res = await api.get(`/merchants/${target.merchantId}/wallet`, target.token).expect(200);
    return { available: Number(res.body.data.availableBalance), totalTopUp: Number(res.body.data.totalTopUp) };
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
  });

  afterAll(async () => {
    await app.close();
  });

  it('credits the wallet, and the merchant sees it as a bank transfer in their history', async () => {
    const before = await balanceOf();
    const ref = reference();

    const res = await api.post(topUpUrl(), adminToken).send(body({ amount: 12500.5, bankReference: ref, note: 'Cheque cleared' })).expect(201);

    expect(Number(res.body.data.balanceAfter)).toBe(before.available + 12500.5);
    const after = await balanceOf();
    expect(after.available).toBe(before.available + 12500.5);
    expect(after.totalTopUp).toBe(before.totalTopUp + 12500.5);

    const history = await api.get(`/merchants/${merchant.merchantId}/wallet/transactions`, merchant.token).expect(200);
    const entry = history.body.data.data.find((t: { referenceId: string }) => t.referenceId === ref);
    expect(entry).toMatchObject({ type: 'CREDIT', status: 'SUCCESS' });
    expect(entry.remarks).toContain(ref);
  });

  it('writes an audit entry naming the admin, the amount and the reference', async () => {
    const ref = reference();
    await api.post(topUpUrl(), adminToken).send(body({ amount: 700, bankReference: ref })).expect(201);

    const logs = await prisma.auditLog.findMany({ where: { entity: 'MerchantWallet', entityId: merchant.merchantId, actorType: 'ADMIN' } });
    const entry = logs.find((log) => (log.after as { bankReference?: string } | null)?.bankReference === ref);

    expect(entry).toBeDefined();
    expect(entry?.after).toMatchObject({ amount: 700, bankReference: ref });
    expect(entry?.before).toHaveProperty('availableBalance');
  });

  it('lists what was recorded, newest first, to the admin only', async () => {
    const ref = reference();
    await api.post(topUpUrl(), adminToken).send(body({ bankReference: ref })).expect(201);

    const list = await api.get(topUpUrl(), adminToken).expect(200);
    expect(list.body.data.data[0].bankReference).toBe(ref);

    await api.get(topUpUrl(), merchant.token).expect(403);
  });

  describe('who can do it', () => {
    it('a merchant can not add money to their own wallet this way', async () => {
      const before = await balanceOf();

      await api.post(topUpUrl(), merchant.token).send(body()).expect(403);

      expect(await balanceOf()).toEqual(before);
    });

    it('an ordinary user can not', async () => {
      const user = await api.registerUser();
      await api.post(topUpUrl(), user.token).send(body()).expect(403);
    });

    it('nobody signed out can', async () => {
      await api.post(topUpUrl()).send(body()).expect(401);
    });

    it('a merchant that is not active yet can not be credited', async () => {
      const owner = await api.registerUser();
      const created = await api
        .post('/merchants/register', owner.token)
        .send({ businessName: `Pending Cafe ${Date.now()}`, email: `pending-${Date.now()}@example.com`, phone: `+9196${String(Date.now()).slice(-8)}` })
        .expect(201);

      await api.post(topUpUrl(created.body.data.id), adminToken).send(body()).expect(400);
    });

    it('a merchant that does not exist is not found', async () => {
      await api.post(topUpUrl('00000000-0000-4000-8000-000000000000'), adminToken).send(body()).expect(404);
    });
  });

  describe('the same transfer twice', () => {
    it('is refused the second time, and the balance moves only once', async () => {
      const ref = reference();
      const before = await balanceOf();

      await api.post(topUpUrl(), adminToken).send(body({ amount: 3000, bankReference: ref })).expect(201);
      await api.post(topUpUrl(), adminToken).send(body({ amount: 3000, bankReference: ref })).expect(409);

      expect((await balanceOf()).available).toBe(before.available + 3000);
    });

    it('is still the same transfer when the case or spacing is different', async () => {
      const ref = reference();
      await api.post(topUpUrl(), adminToken).send(body({ bankReference: ref })).expect(201);

      await api.post(topUpUrl(), adminToken).send(body({ bankReference: ref.toLowerCase() })).expect(409);
    });

    it('is refused for a different merchant too: one transfer can only ever pay one wallet', async () => {
      const other = await api.registerApprovedMerchant(adminToken);
      const ref = reference();
      await api.post(topUpUrl(), adminToken).send(body({ bankReference: ref })).expect(201);

      await api.post(topUpUrl(other.merchantId), adminToken).send(body({ bankReference: ref })).expect(409);

      expect((await balanceOf(other)).available).toBe(0);
    });

    it('credits once when the same transfer is recorded several times at the same moment', async () => {
      const ref = reference();
      const before = await balanceOf();

      const results = await Promise.all(Array.from({ length: 6 }, () => api.post(topUpUrl(), adminToken).send(body({ amount: 1000, bankReference: ref }))));
      const statuses = results.map((r) => r.status).sort();

      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(5);
      expect((await balanceOf()).available).toBe(before.available + 1000);
      expect(await prisma.merchantManualTopUp.count({ where: { bankReference: ref.toUpperCase() } })).toBe(1);
      expect(await prisma.walletTransaction.count({ where: { referenceType: 'ManualTopUp', referenceId: ref.toUpperCase() } })).toBe(1);
    });
  });

  describe('different transfers at the same moment', () => {
    it('are all added, with nothing lost', async () => {
      const target = await api.registerApprovedMerchant(adminToken);
      const amounts = [1000, 2000, 3000, 4000, 5000];

      const results = await Promise.all(amounts.map((amount) => api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount }))));

      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
      const balance = await balanceOf(target);
      expect(balance.available).toBe(15000);
      expect(balance.totalTopUp).toBe(15000);
    });

    it('leave a ledger whose balances add up', async () => {
      const target = await api.registerApprovedMerchant(adminToken);
      await Promise.all([1500, 2500, 500].map((amount) => api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount }))));

      const wallet = await prisma.merchantWallet.findUniqueOrThrow({ where: { merchantId: target.merchantId } });
      const entries = await prisma.walletTransaction.findMany({ where: { merchantWalletId: wallet.id, status: 'SUCCESS' }, orderBy: { createdAt: 'asc' } });

      expect(entries.reduce((sum, e) => sum + Number(e.amount), 0)).toBe(Number(wallet.availableBalance));
      // Each entry starts from where the one before it ended, so no credit was based on a stale balance.
      const ordered = [...entries].sort((a, b) => Number(a.balanceAfter) - Number(b.balanceAfter));
      ordered.forEach((entry, index) => {
        expect(Number(entry.balanceBefore)).toBe(index === 0 ? 0 : Number(ordered[index - 1].balanceAfter));
      });
    });
  });

  describe('what it refuses to record', () => {
    it.each([
      ['a zero amount', { amount: 0 }],
      ['a negative amount', { amount: -100 }],
      ['an amount above the cap', { amount: 1_000_001 }],
      ['a reference that is too short', { bankReference: 'AB1' }],
      ['a date in the wrong format', { receivedOn: '21-09-2026' }],
      ['a field that is not part of the request', { merchantWalletId: 'x' }],
    ])('%s', async (_label, override) => {
      const before = await balanceOf();

      await api.post(topUpUrl(), adminToken).send(body(override)).expect(422);

      expect(await balanceOf()).toEqual(before);
    });

    it('a date in the future, or a date that does not exist', async () => {
      await api.post(topUpUrl(), adminToken).send(body({ receivedOn: '2099-01-01' })).expect(400);
      await api.post(topUpUrl(), adminToken).send(body({ receivedOn: '2026-02-30' })).expect(400);
    });
  });

  describe('a large top-up needs a second admin', () => {
    let secondAdminToken: string;
    let secondAdminId: string;
    const LARGE = 150_000;

    const pendingList = async () => (await api.get('/admin/merchants/top-ups/pending?limit=100', adminToken).expect(200)).body.data.data as { id: string; status: string }[];

    /** Records a large top-up as the first admin, and returns its id. */
    const recordLarge = async (target: TestMerchant = merchant, amount = LARGE) => {
      const res = await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount })).expect(201);
      return res.body.data.id as string;
    };

    beforeAll(async () => {
      // A second administrator: an ordinary account given the admin role, signed in again so the token carries it.
      const person = await api.registerUser();
      const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: 'admin' } });
      await prisma.userRole.create({ data: { userId: person.id, roleId: adminRole.id } });
      secondAdminToken = await api.login(person.email);
      secondAdminId = person.id;
    });

    it('is recorded but not credited, and waits in the approval list', async () => {
      const before = await balanceOf();

      const id = await recordLarge();

      expect(await balanceOf()).toEqual(before);
      expect((await pendingList()).find((t) => t.id === id)?.status).toBe('PENDING_APPROVAL');
      expect(await prisma.merchantManualTopUp.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'PENDING_APPROVAL', walletTransactionId: null });
    });

    it('still uses up the bank reference while it waits, so it can not be recorded twice', async () => {
      const ref = reference();
      await api.post(topUpUrl(), adminToken).send(body({ amount: LARGE, bankReference: ref })).expect(201);

      await api.post(topUpUrl(), adminToken).send(body({ amount: LARGE, bankReference: ref })).expect(409);
    });

    it('is credited when a different admin approves it, once, and it shows in the merchant history', async () => {
      const before = await balanceOf();
      const id = await recordLarge();

      const approved = await api.post(`/admin/merchants/top-ups/${id}/approve`, secondAdminToken).expect(200);

      expect(approved.body.data).toMatchObject({ status: 'COMPLETED', decidedBy: secondAdminId });
      expect(Number(approved.body.data.balanceAfter)).toBe(before.available + LARGE);
      expect((await balanceOf()).available).toBe(before.available + LARGE);
      expect((await pendingList()).map((t) => t.id)).not.toContain(id);
      const history = await api.get(`/merchants/${merchant.merchantId}/wallet/transactions?limit=100`, merchant.token).expect(200);
      expect((history.body.data.data as { amount: string; type: string }[]).some((t) => t.type === 'CREDIT' && Number(t.amount) === LARGE)).toBe(true);
    });

    it('is not approved or rejected by the admin who recorded it', async () => {
      const before = await balanceOf();
      const id = await recordLarge();

      await api.post(`/admin/merchants/top-ups/${id}/approve`, adminToken).expect(403);
      await api.post(`/admin/merchants/top-ups/${id}/reject`, adminToken).send({ reason: 'I changed my mind' }).expect(403);

      expect(await balanceOf()).toEqual(before);
      expect((await prisma.merchantManualTopUp.findUniqueOrThrow({ where: { id } })).status).toBe('PENDING_APPROVAL');
    });

    it('is credited once when several approvals arrive at the same moment', async () => {
      const before = await balanceOf();
      const id = await recordLarge();

      const results = await Promise.all([1, 2, 3, 4].map(() => api.post(`/admin/merchants/top-ups/${id}/approve`, secondAdminToken)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(3);
      expect((await balanceOf()).available).toBe(before.available + LARGE);
    });

    it('credits nothing when a different admin rejects it, and gives the bank reference back', async () => {
      const before = await balanceOf();
      const ref = reference();
      const created = await api.post(topUpUrl(), adminToken).send(body({ amount: LARGE, bankReference: ref })).expect(201);

      const rejected = await api
        .post(`/admin/merchants/top-ups/${created.body.data.id}/reject`, secondAdminToken)
        .send({ reason: 'The amount does not match the statement' })
        .expect(200);

      expect(rejected.body.data).toMatchObject({ status: 'REJECTED', bankReference: null, rejectedReference: ref.toUpperCase(), rejectionReason: 'The amount does not match the statement' });
      expect(await balanceOf()).toEqual(before);
      // The transfer is real, and this time it is entered properly.
      await api.post(topUpUrl(), adminToken).send(body({ amount: 90_000, bankReference: ref })).expect(201);
    });

    it('a decided top-up can not be decided again', async () => {
      const id = await recordLarge();
      await api.post(`/admin/merchants/top-ups/${id}/reject`, secondAdminToken).send({ reason: 'Not the right amount' }).expect(200);

      await api.post(`/admin/merchants/top-ups/${id}/approve`, secondAdminToken).expect(400);
      await api.post(`/admin/merchants/top-ups/${id}/reject`, secondAdminToken).send({ reason: 'Not the right amount' }).expect(400);
    });

    it('a top-up at the threshold is still credited at once', async () => {
      const before = await balanceOf();
      await api.post(topUpUrl(), adminToken).send(body({ amount: 100_000 })).expect(201);
      expect((await balanceOf()).available).toBe(before.available + 100_000);
    });

    it('follows the threshold the admin sets, and 0 turns the second admin off', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ manualTopUpApprovalThreshold: 2000 }).expect(200);
      try {
        const waiting = await api.post(topUpUrl(), adminToken).send(body({ amount: 2500 })).expect(201);
        expect(waiting.body.data.status).toBe('PENDING_APPROVAL');

        await api.patch('/admin/platform-configuration', adminToken).send({ manualTopUpApprovalThreshold: 0 }).expect(200);
        const atOnce = await api.post(topUpUrl(), adminToken).send(body({ amount: 900_000 })).expect(201);
        expect(atOnce.body.data.status).toBe('COMPLETED');
      } finally {
        await api.patch('/admin/platform-configuration', adminToken).send({ manualTopUpApprovalThreshold: 100_000 }).expect(200);
      }
    });

    it('only an admin can approve, reject or list them', async () => {
      const id = await recordLarge();

      await api.post(`/admin/merchants/top-ups/${id}/approve`, merchant.token).expect(403);
      await api.post(`/admin/merchants/top-ups/${id}/reject`, merchant.token).send({ reason: 'Nope nope' }).expect(403);
      await api.get('/admin/merchants/top-ups/pending', merchant.token).expect(403);
    });
  });

  describe('reversing a top-up made in error', () => {
    /** A separate merchant each time, so what is spent in one test can not affect another. */
    const freshMerchant = async () => api.registerApprovedMerchant(adminToken);
    const record = async (target: TestMerchant, amount: number) => (await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount })).expect(201)).body.data.id as string;
    const reverse = (id: string, reason = 'The amount was typed wrongly') => api.post(`/admin/merchants/top-ups/${id}/reverse`, adminToken).send({ reason });
    const walletOfMerchant = async (target: TestMerchant) => (await api.get(`/merchants/${target.merchantId}/wallet`, target.token).expect(200)).body.data;

    it('takes the money back out with a new opposite entry, and keeps the original in the history', async () => {
      const target = await freshMerchant();
      const id = await record(target, 5000);

      const res = await reverse(id).expect(200);

      expect(res.body.data).toMatchObject({ status: 'REVERSED', reversedAt: expect.any(String), reversalReason: 'The amount was typed wrongly' });
      expect(Number(res.body.data.balanceAfter)).toBe(0);
      const wallet = await walletOfMerchant(target);
      expect(Number(wallet.availableBalance)).toBe(0);
      expect(Number(wallet.totalTopUp)).toBe(0);
      const kinds = (await prisma.walletTransaction.findMany({ where: { merchantWallet: { merchantId: target.merchantId } }, orderBy: { createdAt: 'asc' } })).map((t) => t.type);
      expect(kinds).toEqual(['CREDIT', 'DEBIT']);
    });

    it('reverses only once, even when asked several times at the same moment', async () => {
      const target = await freshMerchant();
      await record(target, 3000);
      const id = await record(target, 4000);

      const results = await Promise.all([1, 2, 3, 4].map(() => reverse(id)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(3);
      expect(Number((await walletOfMerchant(target)).availableBalance)).toBe(3000);
    });

    it('refuses when the merchant has already set the money aside, and changes nothing', async () => {
      const target = await freshMerchant();
      const id = await record(target, 2000);
      // Set 1,500 of it aside for a campaign, as a merchant would.
      const campaign = await api
        .post(`/merchants/${target.merchantId}/campaigns`, target.token)
        .send({ title: `E2E reversal ${Date.now()}`, description: 'Share your honest experience after visiting our cafe this week.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 1500, maxParticipants: 20 })
        .expect(201);
      await api.post(`/campaigns/${campaign.body.data.id}/tasks`, target.token).send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 }).expect(201);
      await api.post(`/campaigns/${campaign.body.data.id}/submit`, target.token).expect(200);
      await api.post(`/admin/campaigns/${campaign.body.data.id}/approve`, adminToken).send({}).expect(200);
      await api.post(`/merchants/${target.merchantId}/campaigns/${campaign.body.data.id}/fund`, target.token).expect(200);

      const res = await reverse(id);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Only ₹500\.00 of this ₹2000\.00 is still available/);
      expect((await prisma.merchantManualTopUp.findUniqueOrThrow({ where: { id } })).status).toBe('COMPLETED');
    });

    it('keeps the bank reference used, so the same transfer can not be credited again by mistake', async () => {
      const target = await freshMerchant();
      const ref = reference();
      const created = await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount: 1000, bankReference: ref })).expect(201);
      await reverse(created.body.data.id).expect(200);

      await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount: 1000, bankReference: ref })).expect(409);
    });

    it('a top-up that was never credited, or is already reversed, can not be reversed', async () => {
      const target = await freshMerchant();
      const id = await record(target, 1000);
      await reverse(id).expect(200);
      await reverse(id).expect(400);

      const waiting = await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount: 150_000 })).expect(201);
      await reverse(waiting.body.data.id).expect(400);
    });

    it('writes an audit entry for the reversal', async () => {
      const target = await freshMerchant();
      const id = await record(target, 800);

      await reverse(id, 'Recorded against the wrong merchant').expect(200);

      const logs = await prisma.auditLog.findMany({ where: { entity: 'MerchantWallet', entityId: target.merchantId, actorType: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
      const entry = logs.find((l) => (l.after as { reason?: string } | null)?.reason === 'Recorded against the wrong merchant');
      expect(entry?.before).toMatchObject({ availableBalance: 800 });
      expect(entry?.after).toMatchObject({ availableBalance: 0, reversed: 800 });
    });

    it('needs a reason, and only an admin can do it', async () => {
      const target = await freshMerchant();
      const id = await record(target, 500);

      await api.post(`/admin/merchants/top-ups/${id}/reverse`, adminToken).send({}).expect(422);
      await api.post(`/admin/merchants/top-ups/${id}/reverse`, adminToken).send({ reason: 'no' }).expect(422);
      await api.post(`/admin/merchants/top-ups/${id}/reverse`, target.token).send({ reason: 'Give it back' }).expect(403);
    });
  });

  describe('telling the merchant', () => {
    /** Notifications are queued and delivered in the background, so wait (briefly) for the record to appear. */
    const waitForNotification = async (userId: string, title: string, timeoutMs = 8000) => {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const found = await prisma.notification.findFirst({ where: { userId, title } });
        if (found || Date.now() > deadline) return found;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    };

    it('tells the owner when money is added, and when a top-up is reversed', async () => {
      const target = await api.registerApprovedMerchant(adminToken);
      const created = await api.post(topUpUrl(target.merchantId), adminToken).send(body({ amount: 1200 })).expect(201);

      const added = await waitForNotification(target.id, 'Money added to your wallet');
      expect(added?.message).toMatch(/₹1200/);

      await api.post(`/admin/merchants/top-ups/${created.body.data.id}/reverse`, adminToken).send({ reason: 'Typed the wrong amount' }).expect(200);
      const reversed = await waitForNotification(target.id, 'A wallet top-up was reversed');
      expect(reversed?.message).toMatch(/Typed the wrong amount/);
    });
  });

  it('a merchant can spend what was credited: it funds a campaign', async () => {
    const funded = await api.registerApprovedMerchant(adminToken);
    await api.post(topUpUrl(funded.merchantId), adminToken).send(body({ amount: 2000 })).expect(201);

    const campaign = await api
      .post(`/merchants/${funded.merchantId}/campaigns`, funded.token)
      .send({
        title: `Funded by transfer ${Date.now()}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount: 50,
        totalBudget: 1000,
        maxParticipants: 20,
      })
      .expect(201);
    await api
      .post(`/campaigns/${campaign.body.data.id}/tasks`, funded.token)
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 })
      .expect(201);
    await api.post(`/campaigns/${campaign.body.data.id}/submit`, funded.token).expect(200);
    await api.post(`/admin/campaigns/${campaign.body.data.id}/approve`, adminToken).send({}).expect(200);

    await api.post(`/merchants/${funded.merchantId}/campaigns/${campaign.body.data.id}/fund`, funded.token).expect(200);

    expect((await balanceOf(funded)).available).toBe(1000);
  });
});
