import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * What a merchant sees of how their campaigns are doing. The numbers are counted from real joins and credited rewards, so
 * the tests do the real thing (people join, submit, an admin approves, rewards are paid) and then check the figures.
 */
describe('Merchant analytics (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;
  let campaignId: string;
  let taskId: string;

  const overview = async (days?: number, owner: TestMerchant = merchant) =>
    (await api.get(`/merchants/${owner.merchantId}/campaigns/overview${days ? `?days=${days}` : ''}`, owner.token).expect(200)).body.data;

  /** Starts a live campaign with one text task paying ₹50, and returns the ids. */
  const liveCampaign = async (owner: TestMerchant, title: string, budget = 5000) => {
    const campaign = await api
      .post(`/merchants/${owner.merchantId}/campaigns`, owner.token)
      .send({ title, description: 'Share your honest experience after visiting our cafe this week.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: budget, maxParticipants: 100 })
      .expect(201);
    const task = await api
      .post(`/campaigns/${campaign.body.data.id}/tasks`, owner.token)
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 })
      .expect(201);
    await api.post(`/campaigns/${campaign.body.data.id}/submit`, owner.token).expect(200);
    await api.post(`/admin/campaigns/${campaign.body.data.id}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${owner.merchantId}/campaigns/${campaign.body.data.id}/fund`, owner.token).expect(200);
    return { campaignId: campaign.body.data.id as string, taskId: task.body.data.id as string };
  };

  /** A user joins, submits, and the admin approves (or rejects) the submission. */
  const takePart = async (user: TestUser, task: string, decision: 'approve' | 'reject' = 'approve') => {
    await api.post(`/tasks/${task}/start`, user.token).expect(200);
    const submitted = await api.post(`/tasks/${task}/submit`, user.token).field('textAnswer', 'The coffee was great and the staff were friendly.').expect(201);
    const id = submitted.body.data.id;
    if (decision === 'approve') await api.post(`/submissions/${id}/approve`, adminToken).expect(200);
    else await api.post(`/submissions/${id}/reject`, adminToken).send({ rejectionReason: 'The screenshot does not show the review.' }).expect(200);
  };

  /**
   * Rewards are paid by a background worker, in steps: the user is credited, then the campaign budget is charged. Wait
   * (briefly) until the wanted number has been credited AND charged, so a figure is never read half-way through.
   */
  const waitForRewards = async (forCampaign: string, count: number, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const credited = await prisma.reward.count({ where: { campaignId: forCampaign, status: 'CREDITED' } });
      const charged = await prisma.walletTransaction.count({ where: { type: 'SPEND', referenceType: 'Reward', status: 'SUCCESS', referenceId: { in: (await prisma.reward.findMany({ where: { campaignId: forCampaign }, select: { id: true } })).map((r) => r.id) } } });
      if (credited >= count && charged >= count) return;
      if (Date.now() > deadline) throw new Error(`Only ${credited} of ${count} rewards were credited and ${charged} charged`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);
    ({ campaignId, taskId } = await liveCampaign(merchant, `E2E analytics ${Date.now()}`));

    // Three people are paid; a fourth is turned down.
    for (let i = 0; i < 3; i += 1) await takePart(await api.registerUser(), taskId);
    await takePart(await api.registerUser(), taskId, 'reject');
    await waitForRewards(campaignId, 3);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('one campaign', () => {
    it('counts who joined, who finished, what was paid and what was turned down', async () => {
      const stats = (await api.get(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/analytics`, merchant.token).expect(200)).body.data;

      expect(stats).toMatchObject({ joins: 4, completions: 3, rejections: 1, rewardPaid: 150, budgetUsed: 150 });
      expect(stats.finished).toBeGreaterThanOrEqual(3);
      expect(stats.completionRate).toBeGreaterThan(0);
      expect(stats.completionRate).toBeLessThanOrEqual(1);
    });

    it('no longer reports views or a conversion rate, because nothing measures them', async () => {
      const stats = (await api.get(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/analytics`, merchant.token).expect(200)).body.data;

      expect(stats).not.toHaveProperty('views');
      expect(stats).not.toHaveProperty('conversionRate');
    });

    it('shows zeros for a campaign nobody has joined', async () => {
      const empty = await liveCampaign(merchant, `E2E empty ${Date.now()}`);

      const stats = (await api.get(`/merchants/${merchant.merchantId}/campaigns/${empty.campaignId}/analytics`, merchant.token).expect(200)).body.data;

      expect(stats).toMatchObject({ joins: 0, finished: 0, completions: 0, rejections: 0, completionRate: 0, rewardPaid: 0, budgetUsed: 0, avgCompletionSec: 0 });
    });

    it('is not available for another merchant’s campaign', async () => {
      const other = await api.registerApprovedMerchant(adminToken);

      await api.get(`/merchants/${other.merchantId}/campaigns/${campaignId}/analytics`, other.token).expect(404);
      await api.get(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/analytics`, other.token).expect(403);
    });
  });

  describe('the overview', () => {
    it('adds up the merchant’s campaigns, and works out what each completed task cost', async () => {
      const result = await overview(30);

      expect(result.totals).toMatchObject({ joins: 4, completions: 3, rewardsPaid: 150, budgetSpent: 150, costPerCompletion: 50 });
      expect(result.totals.campaigns).toBeGreaterThanOrEqual(1);
      expect(result.totals.activeCampaigns).toBeGreaterThanOrEqual(1);
    });

    it('lists each campaign with its own figures, biggest spender first', async () => {
      const result = await overview();

      const row = result.campaigns.find((c: { id: string }) => c.id === campaignId);
      expect(row).toMatchObject({ joins: 4, completions: 3, rewardsPaid: 150, spentBudget: 150, totalBudget: 5000, costPerCompletion: 50, status: 'ACTIVE' });
      expect(result.campaigns[0].id).toBe(campaignId);
    });

    it('shows today’s joins and rewards on today’s bar, and zeros on every other day', async () => {
      const result = await overview(7);
      const today = result.daily[result.daily.length - 1];

      expect(result.daily).toHaveLength(7);
      expect(today).toMatchObject({ joins: 4, completions: 3, rewardsPaid: 150 });
      expect(result.daily.slice(0, 6).every((d: { joins: number; rewardsPaid: number }) => d.joins === 0 && d.rewardsPaid === 0)).toBe(true);
      expect(result.period).toMatchObject({ days: 7, to: today.date });
    });

    it('covers the period asked for: 7, 30 or 90 days', async () => {
      for (const days of [7, 30, 90]) expect((await overview(days)).daily).toHaveLength(days);
    });

    it('does not show one merchant another’s numbers', async () => {
      const other = await api.registerApprovedMerchant(adminToken);
      await api.rechargeMerchant(other, 5000);

      const result = await overview(30, other);

      expect(result.totals).toMatchObject({ campaigns: 0, joins: 0, completions: 0, rewardsPaid: 0, costPerCompletion: null });
      expect(result.campaigns).toEqual([]);
      expect(result.daily.every((d: { joins: number }) => d.joins === 0)).toBe(true);
    });

    it('leaves out a reward that was reversed, because the budget was given back', async () => {
      const own = await api.registerApprovedMerchant(adminToken);
      await api.rechargeMerchant(own, 5000);
      const { campaignId: reversedCampaign, taskId: reversedTask } = await liveCampaign(own, `E2E reversal ${Date.now()}`, 1000);
      await takePart(await api.registerUser(), reversedTask);
      await takePart(await api.registerUser(), reversedTask);
      await waitForRewards(reversedCampaign, 2);
      const before = await overview(30, own);
      expect(before.totals).toMatchObject({ completions: 2, rewardsPaid: 100 });

      const reward = await prisma.reward.findFirstOrThrow({ where: { campaignId: reversedCampaign, status: 'CREDITED' } });
      await prisma.reward.update({ where: { id: reward.id }, data: { status: 'REVERSED', reversedAt: new Date() } });

      const after = await overview(30, own);
      expect(after.totals).toMatchObject({ completions: 1, rewardsPaid: 50 });
      expect(after.daily[after.daily.length - 1]).toMatchObject({ completions: 1, rewardsPaid: 50 });
    });
  });

  describe('who can see it', () => {
    it('another merchant can not read this merchant’s overview', async () => {
      const other = await api.registerApprovedMerchant(adminToken);
      await api.get(`/merchants/${merchant.merchantId}/campaigns/overview`, other.token).expect(403);
    });

    it('an ordinary user can not', async () => {
      const user = await api.registerUser();
      await api.get(`/merchants/${merchant.merchantId}/campaigns/overview`, user.token).expect(403);
    });

    it('nobody signed out can', async () => {
      await api.get(`/merchants/${merchant.merchantId}/campaigns/overview`).expect(401);
    });

    it.each(['0', '15', '365', 'abc'])('refuses a period of %s days', async (days) => {
      await api.get(`/merchants/${merchant.merchantId}/campaigns/overview?days=${days}`, merchant.token).expect(422);
    });
  });
});
