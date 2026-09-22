import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * The money path, end to end: a user completes a task, an admin approves it, the reward lands in the wallet, and the
 * user withdraws it. The rules under test are the ones that stop money being created, lost or spent twice.
 */
describe('Rewards and withdrawals (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;
  let merchant: TestMerchant;
  let taskId: string;
  let campaignId: string;

  const walletOf = async (user: TestUser) => (await api.get('/wallet', user.token).expect(200)).body.data;

  /** Rewards are paid by a background worker after approval, so wait (briefly) for the wallet to show them. */
  const waitForBalance = async (user: TestUser, atLeast: number, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const wallet = await walletOf(user);
      if (Number(wallet.availableBalance) >= atLeast) return wallet;
      if (Date.now() > deadline) {
        // Say what the database holds, so a timeout is a diagnosis and not just "it did not arrive".
        const prisma = app.get(PrismaService);
        const rewards = await prisma.reward.findMany({ where: { userId: user.id }, select: { id: true, status: true, amount: true, failedReason: true } });
        const submissions = await prisma.taskSubmission.findMany({ where: { userId: user.id }, select: { id: true, status: true } });
        const txns = await prisma.walletTransaction.findMany({ where: { wallet: { userId: user.id } }, select: { type: true, status: true, amount: true } });
        throw new Error(`Balance stayed at ${wallet.availableBalance}. rewards=${JSON.stringify(rewards)} submissions=${JSON.stringify(submissions)} txns=${JSON.stringify(txns)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  /** Waits until the campaign shows what the background worker did to its budget. */
  const waitForCampaign = async (isReady: (campaign: { spentBudget: string; remainingBudget: string }) => boolean, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const campaign = (await api.get(`/campaigns/${campaignId}`, merchant.token).expect(200)).body.data;
      if (isReady(campaign)) return campaign as { spentBudget: string; remainingBudget: string };
      if (Date.now() > deadline) throw new Error(`Campaign budget did not change: spent ${campaign.spentBudget}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  /** Long enough for a duplicate reward job, if there were one, to have run. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 1500));

  /** The user starts the task, submits a text answer, and an admin approves the submission. Returns the submission id. */
  const completeTask = async (user: TestUser): Promise<string> => {
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
    const submitted = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'The coffee was great and the staff were friendly.').expect(201);
    const submissionId: string = submitted.body.data.id;
    await api.post(`/submissions/${submissionId}/approve`, adminToken).expect(200);
    return submissionId;
  };

  const approvePan = (user: TestUser) => api.approvePan(user, adminToken);

  const addBank = (user: TestUser) => api.addBankAccount(user);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);

    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `E2E rewards ${Date.now()}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount: 50,
        totalBudget: 10000,
        maxParticipants: 200,
      })
      .expect(201);
    campaignId = campaign.body.data.id;
    const task = await api
      .post(`/campaigns/${campaignId}/tasks`, merchant.token)
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 })
      .expect(201);
    taskId = task.body.data.id;
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('earning a reward', () => {
    it('a user who completes a task and is approved receives the reward in their wallet', async () => {
      const user = await api.registerUser();

      await completeTask(user);

      const wallet = await waitForBalance(user, 50);
      expect(Number(wallet.availableBalance)).toBe(50);
      expect(Number(wallet.lifetimeEarnings)).toBe(50);
    });

    it('approving the same submission again does not pay the reward twice', async () => {
      const user = await api.registerUser();
      const submissionId = await completeTask(user);
      await waitForBalance(user, 50);

      await api.post(`/submissions/${submissionId}/approve`, adminToken);
      await settle();

      expect(Number((await walletOf(user)).availableBalance)).toBe(50);
    });

    it('pays a reward whose first attempt died half-way, instead of leaving the user unpaid for good', async () => {
      // A worker that created the reward row and then failed (a lock wait, a dropped connection) leaves it exactly
      // like this. The retry used to see the row, decide the job was done, and skip it: the user was never paid.
      const user = await api.registerUser();
      await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
      const submitted = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'Wonderful evening, the service was great.').expect(201);
      const submissionId: string = submitted.body.data.id;
      const before = (await api.get(`/campaigns/${campaignId}`, merchant.token).expect(200)).body.data;
      await app.get(PrismaService).reward.create({
        data: { userId: user.id, campaignId, submissionId, rewardType: 'CASH', amount: 50, status: 'APPROVED', approvedAt: new Date() },
      });

      await api.post(`/submissions/${submissionId}/approve`, adminToken).expect(200);

      const wallet = await waitForBalance(user, 50);
      expect(Number(wallet.availableBalance)).toBe(50);
      // ...and the merchant is charged for it, exactly once.
      const after = await waitForCampaign((c) => Number(c.spentBudget) - Number(before.spentBudget) >= 50);
      await settle();
      const settled = (await api.get(`/campaigns/${campaignId}`, merchant.token).expect(200)).body.data;
      expect(Number(settled.spentBudget) - Number(before.spentBudget)).toBe(50);
      expect(Number(after.spentBudget)).toBeGreaterThanOrEqual(Number(before.spentBudget) + 50);
      const reward = await app.get(PrismaService).reward.findUnique({ where: { submissionId } });
      expect(reward?.status).toBe('CREDITED');
    });

    it('two admins approving the same submission at the same moment pay the reward once', async () => {
      const user = await api.registerUser();
      await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
      const submitted = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'Lovely place, the food and service were excellent.').expect(201);
      const submissionId: string = submitted.body.data.id;

      await Promise.all([
        api.post(`/submissions/${submissionId}/approve`, adminToken),
        api.post(`/submissions/${submissionId}/approve`, adminToken),
        api.post(`/submissions/${submissionId}/approve`, adminToken),
      ]);
      await waitForBalance(user, 50);
      await settle();

      const wallet = await walletOf(user);
      expect(Number(wallet.availableBalance)).toBe(50);
      expect(Number(wallet.lifetimeEarnings)).toBe(50);
    });

    it('a normal user can not approve a submission, even their own', async () => {
      const user = await api.registerUser();
      await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
      const submitted = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'Great cafe, friendly staff and good coffee.').expect(201);

      await api.post(`/submissions/${submitted.body.data.id}/approve`, user.token).expect(403);

      expect(Number((await walletOf(user)).availableBalance)).toBe(0);
    });

    it('the reward comes out of the campaign budget', async () => {
      const user = await api.registerUser();
      const before = await api.get(`/campaigns/${campaignId}`, merchant.token).expect(200);

      await completeTask(user);
      await waitForBalance(user, 50);
      // The worker pays the user first and takes the amount off the campaign budget a moment later.
      const after = await waitForCampaign((c) => Number(c.spentBudget) - Number(before.body.data.spentBudget) >= 50);
      expect(Number(after.spentBudget) - Number(before.body.data.spentBudget)).toBe(50);
      expect(Number(before.body.data.remainingBudget) - Number(after.remainingBudget)).toBe(50);
    });
  });

  describe('withdrawing', () => {
    it('refuses less than the minimum withdrawal', async () => {
      const user = await api.registerUser();
      await completeTask(user);
      await waitForBalance(user, 50);
      const bankAccountId = await addBank(user);

      const res = await api.post('/withdrawals', user.token).send({ amount: 50, bankAccountId });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Minimum withdrawal/);
    });

    it('refuses a withdrawal until the PAN has been verified', async () => {
      const user = await api.registerUser();
      await api.post('/wallet/simulate-add-funds', user.token).send({ amount: 2000 }).expect(200);
      const bankAccountId = await addBank(user);

      const res = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/PAN/);
      expect(Number((await walletOf(user)).availableBalance)).toBe(2000);
    });

    it('refuses a withdrawal larger than the balance', async () => {
      const user = await api.registerUser();
      await api.post('/wallet/simulate-add-funds', user.token).send({ amount: 1000 }).expect(200);
      await approvePan(user);
      const bankAccountId = await addBank(user);

      const res = await api.post('/withdrawals', user.token).send({ amount: 5000, bankAccountId });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Insufficient/);
    });

    it('can not withdraw to someone else’s bank account', async () => {
      const owner = await api.registerUser();
      const thief = await api.registerUser();
      const ownersBank = await addBank(owner);
      await api.post('/wallet/simulate-add-funds', thief.token).send({ amount: 2000 }).expect(200);
      await approvePan(thief);

      await api.post('/withdrawals', thief.token).send({ amount: 1000, bankAccountId: ownersBank }).expect(404);

      expect(Number((await walletOf(thief)).availableBalance)).toBe(2000);
    });

    describe('with a verified PAN and enough balance', () => {
      let user: TestUser;
      let bankAccountId: string;

      beforeEach(async () => {
        user = await api.registerUser();
        await api.post('/wallet/simulate-add-funds', user.token).send({ amount: 3000 }).expect(200);
        await approvePan(user);
        bankAccountId = await addBank(user);
      });

      it('holds the money the moment it is requested, so it can not be spent twice', async () => {
        const res = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId }).expect(201);

        expect(['PENDING', 'UNDER_REVIEW']).toContain(res.body.data.status);
        const wallet = await walletOf(user);
        expect(Number(wallet.availableBalance)).toBe(2000);
        expect(Number(wallet.lockedBalance)).toBe(1000);
      });

      it('two requests at the same moment can not spend the same money twice', async () => {
        const [first, second, third] = await Promise.all([
          api.post('/withdrawals', user.token).send({ amount: 2000, bankAccountId }),
          api.post('/withdrawals', user.token).send({ amount: 2000, bankAccountId }),
          api.post('/withdrawals', user.token).send({ amount: 2000, bankAccountId }),
        ]);

        const succeeded = [first, second, third].filter((r) => r.status === 201);
        expect(succeeded).toHaveLength(1);
        const wallet = await walletOf(user);
        expect(Number(wallet.availableBalance)).toBe(1000);
        expect(Number(wallet.lockedBalance)).toBe(2000);
      });

      it('gives the money back when an admin rejects the request', async () => {
        const requested = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId }).expect(201);

        await api.post(`/withdrawals/${requested.body.data.id}/reject`, adminToken).send({ rejectionReason: 'Bank details do not match the PAN.' }).expect(200);

        const wallet = await walletOf(user);
        expect(Number(wallet.availableBalance)).toBe(3000);
        expect(Number(wallet.lockedBalance)).toBe(0);
      });

      it('a rejected request can not be rejected again to refund the money twice', async () => {
        const requested = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId }).expect(201);
        await api.post(`/withdrawals/${requested.body.data.id}/reject`, adminToken).send({ rejectionReason: 'Not eligible right now.' }).expect(200);

        await api.post(`/withdrawals/${requested.body.data.id}/reject`, adminToken).send({ rejectionReason: 'Not eligible right now.' }).expect(400);

        expect(Number((await walletOf(user)).availableBalance)).toBe(3000);
      });

      it('a normal user can not approve their own withdrawal', async () => {
        const requested = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId }).expect(201);

        await api.post(`/withdrawals/${requested.body.data.id}/approve`, user.token).expect(403);
      });

      it('an admin approves it and the money leaves the wallet for good', async () => {
        const requested = await api.post('/withdrawals', user.token).send({ amount: 1000, bankAccountId }).expect(201);

        await api.post(`/withdrawals/${requested.body.data.id}/approve`, adminToken).expect(200);

        const wallet = await walletOf(user);
        expect(Number(wallet.availableBalance)).toBe(2000);
        expect(Number(wallet.lockedBalance)).toBe(0);
      });
    });
  });
});
