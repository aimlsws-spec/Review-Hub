import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { PAYMENT_EVENTS } from '../src/modules/payment/constants';

import { Api, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * The withdrawal rules an admin sets (minimum, maximum, daily and monthly limits, the wait for a new bank account) and
 * paying withdrawals by hand. This is money leaving the platform, so the tests are about what must never happen: a
 * limit being beaten by two requests at once, a withdrawal being approved or paid twice, or money being returned twice.
 *
 * The rules are changed through the real admin API, and put back after each test, because the database is shared.
 */
describe('Withdrawal rules and manual payout (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;

  let referenceCounter = 0;
  const reference = () => `E2EPAY${Date.now()}${(referenceCounter += 1)}`;

  const setRules = (rules: Record<string, unknown>) => api.patch('/admin/platform-configuration', adminToken).send(rules).expect(200);
  const defaults = { minimumWithdrawal: 1000, maximumWithdrawal: 50000, dailyWithdrawalLimit: 50000, monthlyWithdrawalLimit: null, bankCoolingHours: 0, payoutMode: 'GATEWAY' };

  const walletOf = async (user: TestUser) => {
    const wallet = (await api.get('/wallet', user.token).expect(200)).body.data;
    return { available: Number(wallet.availableBalance), locked: Number(wallet.lockedBalance), withdrawn: Number(wallet.totalWithdrawn) };
  };

  /** A user who can withdraw: PAN approved, a bank account, and a balance. */
  const readyUser = async (balance = 10000) => {
    const user = await api.registerUser();
    await api.fundWallet(user, balance);
    await api.approvePan(user, adminToken);
    const bankAccountId = await api.addBankAccount(user);
    return { user, bankAccountId };
  };

  const withdraw = (user: TestUser, bankAccountId: string, amount: number) => api.post('/withdrawals', user.token).send({ amount, bankAccountId });

  const requestAndApprove = async (user: TestUser, bankAccountId: string, amount = 1000): Promise<string> => {
    const requested = await withdraw(user, bankAccountId, amount).expect(201);
    await api.post(`/withdrawals/${requested.body.data.id}/approve`, adminToken).expect(200);
    return requested.body.data.id;
  };

  const withdrawalRow = (id: string) => prisma.withdrawalRequest.findUniqueOrThrow({ where: { id } });

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
  });

  afterEach(async () => {
    await setRules(defaults);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('the rules an admin sets', () => {
    it('refuses to save limits that contradict each other, and keeps what was saved', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ minimumWithdrawal: 60000 }).expect(400);
      await api.patch('/admin/platform-configuration', adminToken).send({ dailyWithdrawalLimit: 500 }).expect(400);
      await api.patch('/admin/platform-configuration', adminToken).send({ monthlyWithdrawalLimit: 100 }).expect(400);

      const config = (await api.get('/admin/platform-configuration', adminToken).expect(200)).body.data;
      expect(Number(config.minimumWithdrawal)).toBe(1000);
    });

    it('refuses nonsense values', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ bankCoolingHours: -1 }).expect(422);
      await api.patch('/admin/platform-configuration', adminToken).send({ payoutMode: 'CARRIER_PIGEON' }).expect(422);
      await api.patch('/admin/platform-configuration', adminToken).send({ minimumWithdrawal: 0 }).expect(422);
    });

    it('only an admin can change them', async () => {
      const { user } = await readyUser(0);
      await api.patch('/admin/platform-configuration', user.token).send({ minimumWithdrawal: 1 }).expect(403);
    });

    it('the minimum follows what the admin sets', async () => {
      const { user, bankAccountId } = await readyUser();

      const before = await withdraw(user, bankAccountId, 500);
      expect(before.status).toBe(400);
      expect(JSON.stringify(before.body)).toMatch(/Minimum withdrawal amount is ₹1,000/);

      await setRules({ minimumWithdrawal: 500 });
      await withdraw(user, bankAccountId, 500).expect(201);
    });

    it('the maximum for one request follows what the admin sets', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ maximumWithdrawal: 2000 });

      const res = await withdraw(user, bankAccountId, 3000);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Maximum withdrawal amount is ₹2,000 at a time/);
      expect((await walletOf(user)).locked).toBe(0);
    });
  });

  describe('the daily limit', () => {
    it('stops a request that would go over, says how much is left, and holds nothing for it', async () => {
      const { user, bankAccountId } = await readyUser(10000);
      await setRules({ dailyWithdrawalLimit: 2500 });

      await withdraw(user, bankAccountId, 1000).expect(201);
      await withdraw(user, bankAccountId, 1000).expect(201);
      const over = await withdraw(user, bankAccountId, 1000);

      expect(over.status).toBe(400);
      expect(JSON.stringify(over.body)).toMatch(/daily withdrawal limit of ₹2,500/);
      expect(JSON.stringify(over.body)).toMatch(/up to ₹500 more today/);
      expect(await walletOf(user)).toMatchObject({ locked: 2000, available: 8000 });
      expect(await prisma.withdrawalRequest.count({ where: { wallet: { userId: user.id } } })).toBe(2);
    });

    it('gives the limit back when a request is rejected', async () => {
      const { user, bankAccountId } = await readyUser(10000);
      await setRules({ dailyWithdrawalLimit: 2000 });
      const first = await withdraw(user, bankAccountId, 1000).expect(201);
      await withdraw(user, bankAccountId, 1000).expect(201);
      await withdraw(user, bankAccountId, 1000).expect(400);

      await api.post(`/withdrawals/${first.body.data.id}/reject`, adminToken).send({ rejectionReason: 'Bank details do not match.' }).expect(200);

      await withdraw(user, bankAccountId, 1000).expect(201);
    });

    it('is not beaten by several requests made at the same moment', async () => {
      const { user, bankAccountId } = await readyUser(20000);
      await setRules({ dailyWithdrawalLimit: 2500 });

      const results = await Promise.all(Array.from({ length: 6 }, () => withdraw(user, bankAccountId, 1000)));

      expect(results.filter((r) => r.status === 201)).toHaveLength(2);
      expect(results.filter((r) => r.status === 400)).toHaveLength(4);
      expect(await walletOf(user)).toMatchObject({ locked: 2000, available: 18000 });
    });

    it('is counted for each person separately', async () => {
      const a = await readyUser(5000);
      const b = await readyUser(5000);
      await setRules({ dailyWithdrawalLimit: 1000 });

      await withdraw(a.user, a.bankAccountId, 1000).expect(201);
      await withdraw(b.user, b.bankAccountId, 1000).expect(201);
    });
  });

  describe('the monthly limit', () => {
    it('applies across days, and can be cleared', async () => {
      // The month runs on India time. On its first day yesterday is last month, so "earlier this month" can not be built.
      if (new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCDate() === 1) return;

      const { user, bankAccountId } = await readyUser(10000);
      await setRules({ dailyWithdrawalLimit: 2000, monthlyWithdrawalLimit: 3000 });
      await withdraw(user, bankAccountId, 1000).expect(201);
      await withdraw(user, bankAccountId, 1000).expect(201);
      await withdraw(user, bankAccountId, 1000).expect(400);
      // Those two happened yesterday, so today's daily limit is free again, but they still count for the month.
      await prisma.withdrawalRequest.updateMany({ where: { wallet: { userId: user.id } }, data: { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

      await withdraw(user, bankAccountId, 1000).expect(201);
      const over = await withdraw(user, bankAccountId, 1000);
      expect(over.status).toBe(400);
      expect(JSON.stringify(over.body)).toMatch(/monthly withdrawal limit of ₹3,000/);

      await setRules({ monthlyWithdrawalLimit: null });
      await withdraw(user, bankAccountId, 1000).expect(201);
    });

    it('is refused as a setting when it is lower than the daily limit', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ monthlyWithdrawalLimit: 1000, dailyWithdrawalLimit: 2000 }).expect(400);
    });
  });

  describe('the wait before a new bank account can be paid', () => {
    it('refuses a new account, then allows it once it is old enough', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      await setRules({ bankCoolingHours: 24 });

      const early = await withdraw(user, bankAccountId, 1000);
      expect(early.status).toBe(400);
      expect(JSON.stringify(early.body)).toMatch(/added or changed recently/);
      expect((await walletOf(user)).locked).toBe(0);

      await prisma.userBankAccount.update({ where: { id: bankAccountId }, data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } });
      await withdraw(user, bankAccountId, 1000).expect(201);
    });

    it('starts again when the payout details of an old account are changed', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      await prisma.userBankAccount.update({ where: { id: bankAccountId }, data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
      await setRules({ bankCoolingHours: 24 });
      await withdraw(user, bankAccountId, 1000).expect(201);

      await api.patch(`/wallet/bank-accounts/${bankAccountId}`, user.token).send({ ifscCode: 'HDFC0000053' }).expect(200);

      await withdraw(user, bankAccountId, 1000).expect(400);
    });

    it('does not start again just because the account was made the primary one', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      await prisma.userBankAccount.update({ where: { id: bankAccountId }, data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
      await setRules({ bankCoolingHours: 24 });

      await api.patch(`/wallet/bank-accounts/${bankAccountId}`, user.token).send({ isPrimary: true }).expect(200);

      await withdraw(user, bankAccountId, 1000).expect(201);
    });
  });

  describe('approving and rejecting at the same moment', () => {
    it('two approvals move the money once', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const requested = await withdraw(user, bankAccountId, 1000).expect(201);

      const results = await Promise.all([1, 2, 3].map(() => api.post(`/withdrawals/${requested.body.data.id}/approve`, adminToken)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(2);
      expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });
      expect(await prisma.walletTransaction.count({ where: { referenceType: 'WithdrawalRequest', referenceId: requested.body.data.id, type: 'WITHDRAWAL' } })).toBe(1);
    });

    it('an approval and a rejection together settle it one way only, and the money adds up', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const requested = await withdraw(user, bankAccountId, 1000).expect(201);
      const id = requested.body.data.id;

      const [approve, reject] = await Promise.all([
        api.post(`/withdrawals/${id}/approve`, adminToken),
        api.post(`/withdrawals/${id}/reject`, adminToken).send({ rejectionReason: 'Changed my mind.' }),
      ]);

      expect([approve.status, reject.status].sort()).toEqual([200, 400]);
      const wallet = await walletOf(user);
      const status = (await withdrawalRow(id)).status;
      expect(wallet.locked).toBe(0);
      if (status === 'REJECTED') expect(wallet).toEqual({ available: 5000, locked: 0, withdrawn: 0 });
      else expect(wallet).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });
    });
  });

  describe('paying by hand', () => {
    beforeEach(async () => {
      await setRules({ payoutMode: 'MANUAL' });
    });

    it('approving waits for a person: nothing is sent to the gateway, and it is offered to an admin', async () => {
      const { user, bankAccountId } = await readyUser(5000);

      const id = await requestAndApprove(user, bankAccountId);

      const row = await withdrawalRow(id);
      expect(row).toMatchObject({ status: 'APPROVED', payoutMode: 'MANUAL' });
      expect(row.metadata).toBeNull();
      expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });

      const queue = await api.get('/admin/withdrawals/awaiting-payout?limit=100', adminToken).expect(200);
      const ids = (queue.body.data.data as { id: string; bankAccount: { accountNumber: string } }[]).map((w) => w.id);
      expect(ids).toContain(id);
    });

    it('records the bank reference and who paid, keeps the approver, and takes it off the list', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);
      const ref = reference();

      const res = await api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: ref, note: 'Sent by NEFT' }).expect(200);

      expect(res.body.data).toMatchObject({ status: 'PAID', payoutMode: 'MANUAL', payoutReference: ref });
      const row = await withdrawalRow(id);
      expect(row.paidAt).not.toBeNull();
      expect(row.processedBy).not.toBeNull();
      expect(row.metadata).toMatchObject({ paidNote: 'Sent by NEFT' });
      expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });

      const queue = await api.get('/admin/withdrawals/awaiting-payout?limit=100', adminToken).expect(200);
      expect((queue.body.data.data as { id: string }[]).map((w) => w.id)).not.toContain(id);
      expect(await prisma.withdrawalLog.count({ where: { withdrawalId: id, newStatus: 'PAID' } })).toBe(1);
    });

    it('a bank reference settles one withdrawal only, whatever its spacing or case', async () => {
      const a = await readyUser(5000);
      const b = await readyUser(5000);
      const first = await requestAndApprove(a.user, a.bankAccountId);
      const second = await requestAndApprove(b.user, b.bankAccountId);
      const ref = reference();

      await api.post(`/withdrawals/${first}/mark-paid`, adminToken).send({ reference: ref }).expect(200);
      await api.post(`/withdrawals/${second}/mark-paid`, adminToken).send({ reference: ref.toLowerCase() }).expect(409);

      expect((await withdrawalRow(second)).status).toBe('APPROVED');
    });

    it('marking the same one paid several times at once records it once', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);

      const results = await Promise.all(Array.from({ length: 4 }, () => api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: reference() })));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(3);
      expect(await prisma.withdrawalLog.count({ where: { withdrawalId: id, newStatus: 'PAID' } })).toBe(1);
    });

    it('marking it failed gives the money back once, and it can not then be marked paid', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);

      const res = await api.post(`/withdrawals/${id}/mark-failed`, adminToken).send({ reason: 'Account number rejected by the bank' }).expect(200);

      expect(res.body.data).toMatchObject({ status: 'FAILED', rejectionReason: 'Account number rejected by the bank' });
      expect(await walletOf(user)).toEqual({ available: 5000, locked: 0, withdrawn: 0 });
      await api.post(`/withdrawals/${id}/mark-failed`, adminToken).send({ reason: 'Account number rejected by the bank' }).expect(400);
      await api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: reference() }).expect(400);
      expect(await walletOf(user)).toEqual({ available: 5000, locked: 0, withdrawn: 0 });
    });

    it('marking failed at the same moment as paid settles it one way only', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);

      const [paid, failed] = await Promise.all([
        api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: reference() }),
        api.post(`/withdrawals/${id}/mark-failed`, adminToken).send({ reason: 'Bank was down, will resend' }),
      ]);

      expect([paid.status, failed.status].sort()).toEqual([200, 400]);
      const status = (await withdrawalRow(id)).status;
      expect(await walletOf(user)).toEqual(status === 'PAID' ? { available: 4000, locked: 0, withdrawn: 1000 } : { available: 5000, locked: 0, withdrawn: 0 });
    });

    it('can not be settled before it is approved', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const requested = await withdraw(user, bankAccountId, 1000).expect(201);

      await api.post(`/withdrawals/${requested.body.data.id}/mark-paid`, adminToken).send({ reference: reference() }).expect(400);
      await api.post(`/withdrawals/${requested.body.data.id}/mark-failed`, adminToken).send({ reason: 'Not approved yet' }).expect(400);
      expect(await walletOf(user)).toMatchObject({ locked: 1000 });
    });

    it('only an admin can', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);

      await api.post(`/withdrawals/${id}/mark-paid`, user.token).send({ reference: reference() }).expect(403);
      await api.post(`/withdrawals/${id}/mark-failed`, user.token).send({ reason: 'I want it back' }).expect(403);
      await api.get('/admin/withdrawals/awaiting-payout', user.token).expect(403);
    });

    it('refuses a reference in the wrong format', async () => {
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);

      await api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: 'no' }).expect(422);
      await api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({}).expect(422);
      expect((await withdrawalRow(id)).status).toBe('APPROVED');
    });
  });

  describe('paying through the gateway', () => {
    it('a person can not mark a withdrawal the gateway already has, or it could be paid twice', async () => {
      await setRules({ payoutMode: 'GATEWAY' });
      const { user, bankAccountId } = await readyUser(5000);
      const id = await requestAndApprove(user, bankAccountId);
      expect((await withdrawalRow(id)).status).toBe('PROCESSING');

      await api.post(`/withdrawals/${id}/mark-paid`, adminToken).send({ reference: reference() }).expect(400);
      await api.post(`/withdrawals/${id}/mark-failed`, adminToken).send({ reason: 'Trying to take it back' }).expect(400);
      expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });
    });

    describe('when the gateway reports back', () => {
      const report = (status: 'processed' | 'failed' | 'reversed', referenceId: string, extra: Record<string, unknown> = {}) =>
        app.get(EventEmitter2).emitAsync(PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED, { payoutId: 'pout_e2e', referenceId, status, utr: null, failureReason: null, ...extra });

      it('a failure gives the money back once, even when it is reported several times at the same moment', async () => {
        await setRules({ payoutMode: 'GATEWAY' });
        const { user, bankAccountId } = await readyUser(5000);
        const id = await requestAndApprove(user, bankAccountId);

        await Promise.all([1, 2, 3, 4].map(() => report('failed', id, { failureReason: 'Beneficiary bank down' })));

        expect((await withdrawalRow(id)).status).toBe('FAILED');
        expect(await walletOf(user)).toEqual({ available: 5000, locked: 0, withdrawn: 0 });
        expect(await prisma.walletTransaction.count({ where: { referenceId: id, type: 'REFUND' } })).toBe(1);
      });

      it('a success is recorded once, with the gateway UTR', async () => {
        await setRules({ payoutMode: 'GATEWAY' });
        const { user, bankAccountId } = await readyUser(5000);
        const id = await requestAndApprove(user, bankAccountId);
        const utr = reference();

        await Promise.all([1, 2, 3].map(() => report('processed', id, { utr })));

        expect(await withdrawalRow(id)).toMatchObject({ status: 'PAID', payoutMode: 'GATEWAY', payoutReference: utr });
        expect(await prisma.withdrawalLog.count({ where: { withdrawalId: id, newStatus: 'PAID' } })).toBe(1);
        expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });
      });

      it('a late "failed" after it was paid does not take the money back', async () => {
        await setRules({ payoutMode: 'GATEWAY' });
        const { user, bankAccountId } = await readyUser(5000);
        const id = await requestAndApprove(user, bankAccountId);
        await report('processed', id, { utr: reference() });

        await report('failed', id, { failureReason: 'Too late' });

        expect((await withdrawalRow(id)).status).toBe('PAID');
        expect(await walletOf(user)).toEqual({ available: 4000, locked: 0, withdrawn: 1000 });
      });

      it('a late "processed" after it was returned does not pay it or change the ledger', async () => {
        await setRules({ payoutMode: 'GATEWAY' });
        const { user, bankAccountId } = await readyUser(5000);
        const id = await requestAndApprove(user, bankAccountId);
        await report('failed', id, { failureReason: 'Bank down' });

        await report('processed', id, { utr: reference() });

        expect((await withdrawalRow(id)).status).toBe('FAILED');
        expect(await walletOf(user)).toEqual({ available: 5000, locked: 0, withdrawn: 0 });
      });
    });
  });
});
