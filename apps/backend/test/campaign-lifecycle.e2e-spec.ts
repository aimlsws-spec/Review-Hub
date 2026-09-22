import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * A merchant's campaign from draft to live, through the real API. The point of these tests is the rules that protect
 * money and moderation: a merchant can not approve their own campaign, and can not spend more than they have.
 */
describe('Campaign lifecycle (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;
  let merchant: TestMerchant;

  const draft = (overrides: Record<string, unknown> = {}) => ({
    title: `E2E review drive ${Date.now()}`,
    description: 'Share your honest experience after visiting our cafe this week.',
    campaignType: 'REVIEW',
    rewardAmount: 50,
    totalBudget: 1000,
    maxParticipants: 20,
    ...overrides,
  });

  const createCampaign = async (overrides: Record<string, unknown> = {}) => {
    const res = await api.post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token).send(draft(overrides)).expect(201);
    return res.body.data as { id: string; status: string };
  };

  const addTask = async (campaignId: string) =>
    api
      .post(`/campaigns/${campaignId}/tasks`, merchant.token)
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 })
      .expect(201);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 5000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a draft campaign for the merchant', async () => {
    const campaign = await createCampaign();

    expect(campaign.status).toBe('DRAFT');
  });

  it('a merchant can not create a campaign for someone else’s business', async () => {
    const other = await api.registerUser();

    await api.post(`/merchants/${merchant.merchantId}/campaigns`, other.token).send(draft()).expect(403);
  });

  it('rejects a campaign with an invalid budget', async () => {
    await api.post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token).send(draft({ totalBudget: 0 })).expect(422);
  });

  describe('moderation', () => {
    it('sends a submitted campaign to an admin, even when the merchant asked for auto-approval', async () => {
      const campaign = await createCampaign({ autoApprove: true });
      await addTask(campaign.id);

      const submitted = await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      expect(submitted.body.data.status).toBe('PENDING_REVIEW');
      expect(submitted.body.data.approvedAt).toBeNull();
    });

    it('a merchant can not approve their own campaign through the admin route', async () => {
      const campaign = await createCampaign();
      await addTask(campaign.id);
      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      await api.post(`/admin/campaigns/${campaign.id}/approve`, merchant.token).send({}).expect(403);

      const after = await api.get(`/campaigns/${campaign.id}`, merchant.token).expect(200);
      expect(after.body.data.status).toBe('PENDING_REVIEW');
    });

    it('a campaign can not go live before an admin approves it', async () => {
      const campaign = await createCampaign();
      await addTask(campaign.id);
      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaign.id}/fund`, merchant.token).expect(400);

      const after = await api.get(`/campaigns/${campaign.id}`, merchant.token).expect(200);
      expect(after.body.data.status).toBe('PENDING_REVIEW');
    });

    it('an admin approves it, and the merchant then funds it and it goes live', async () => {
      const campaign = await createCampaign();
      await addTask(campaign.id);
      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      await api.post(`/admin/campaigns/${campaign.id}/approve`, adminToken).send({}).expect(200);
      const funded = await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaign.id}/fund`, merchant.token).expect(200);

      expect(funded.body.data.status).toBe('ACTIVE');
    });

    it('an admin can send a campaign back for changes, and it can be submitted again', async () => {
      const campaign = await createCampaign();
      await addTask(campaign.id);
      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      await api.post(`/admin/campaigns/${campaign.id}/request-changes`, adminToken).send({ comments: 'Please explain the proof needed.' }).expect(200);
      const again = await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      expect(again.body.data.status).toBe('PENDING_REVIEW');
    });
  });

  describe('honest-feedback wording', () => {
    const asksForRating = 'Give us a 5 star review and get Rs 50';

    it('refuses to submit a campaign that asks for a rating, names the words, and keeps it a draft', async () => {
      const campaign = await createCampaign({ description: `Visit our cafe. ${asksForRating}.` });
      await addTask(campaign.id);

      const refused = await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(422);

      expect(refused.body.message).toMatch(/5 star/i);
      const after = await api.get(`/campaigns/${campaign.id}`, merchant.token).expect(200);
      expect(after.body.data.status).toBe('DRAFT');
    });

    it('refuses wording hidden in a task, and lets the merchant fix it and submit again', async () => {
      const campaign = await createCampaign();
      const task = await api
        .post(`/campaigns/${campaign.id}/tasks`, merchant.token)
        .send({ title: 'Write a review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50, instructions: `Leave ${asksForRating}` })
        .expect(201);

      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(422);

      await api
        .patch(`/campaigns/${campaign.id}/tasks/${task.body.data.id}`, merchant.token)
        .send({ instructions: 'Tell us honestly how your visit was, good or bad.' })
        .expect(200);
      const again = await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);

      expect(again.body.data.status).toBe('PENDING_REVIEW');
    });

    it('lets honest wording through, including wording that only mentions ratings', async () => {
      const campaign = await createCampaign({
        description: 'We welcome honest feedback, good or bad. Your reward never depends on the rating you give.',
      });
      await addTask(campaign.id);

      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);
    });

    it('the check endpoint warns without saving anything', async () => {
      const bad = await api
        .post(`/merchants/${merchant.merchantId}/campaigns/check-wording`, merchant.token)
        .send({ title: 'Review drive', tasks: [{ title: 'Review', instructions: asksForRating }] })
        .expect(200);
      const good = await api
        .post(`/merchants/${merchant.merchantId}/campaigns/check-wording`, merchant.token)
        .send({ title: 'Review drive', description: 'Tell us honestly what you thought.' })
        .expect(200);

      expect(bad.body.data.allowed).toBe(false);
      expect(bad.body.data.findings[0].field).toContain('instructions');
      expect(good.body.data).toEqual({ allowed: true, findings: [] });
    });

    it('the check endpoint is for the merchant only', async () => {
      const stranger = await api.registerUser();
      await api.post(`/merchants/${merchant.merchantId}/campaigns/check-wording`, stranger.token).send({ title: 'x' }).expect(403);
    });

    it('the campaign builder refuses an offer line that asks for a rating', async () => {
      await api
        .post(`/merchants/${merchant.merchantId}/campaigns/recommend`, merchant.token)
        .send({ goal: 'MORE_REVIEWS', budget: 5000, highlight: 'Free coffee for a 5 star review' })
        .expect(422);
    });

    it('the admin queue flags a campaign submitted before the rule existed, and approval is refused', async () => {
      const campaign = await createCampaign();
      await addTask(campaign.id);
      // Put a bad campaign in the queue the only way left: directly, as one that was submitted before this rule.
      await app.get(PrismaService).campaign.update({
        where: { id: campaign.id },
        data: { status: 'PENDING_REVIEW', description: `Visit our cafe. ${asksForRating}.` },
      });

      // The test database keeps every earlier run's campaigns, so the queue can be long: look through all of it.
      type QueueRow = { id: string; policyFlags: { severity: string }[] };
      let queued: QueueRow | undefined;
      for (let page = 1; !queued; page += 1) {
        const queue = await api.get(`/admin/campaigns/pending?page=${page}&limit=100`, adminToken).expect(200);
        const rows: QueueRow[] = queue.body.data.data ?? [];
        queued = rows.find((row) => row.id === campaign.id);
        if (rows.length < 100) break;
      }
      expect(queued?.policyFlags.some((flag) => flag.severity === 'BLOCK')).toBe(true);

      await api.post(`/admin/campaigns/${campaign.id}/approve`, adminToken).send({}).expect(422);
      const after = await api.get(`/campaigns/${campaign.id}`, merchant.token).expect(200);
      expect(after.body.data.status).toBe('PENDING_REVIEW');
    });
  });

  describe('funding', () => {
    it('sets the budget aside from the merchant wallet when the campaign goes live', async () => {
      const before = await api.get(`/merchants/${merchant.merchantId}/wallet`, merchant.token).expect(200);
      const campaign = await createCampaign({ totalBudget: 1000 });
      await addTask(campaign.id);
      await api.post(`/campaigns/${campaign.id}/submit`, merchant.token).expect(200);
      await api.post(`/admin/campaigns/${campaign.id}/approve`, adminToken).send({}).expect(200);

      await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaign.id}/fund`, merchant.token).expect(200);

      const after = await api.get(`/merchants/${merchant.merchantId}/wallet`, merchant.token).expect(200);
      expect(Number(before.body.data.availableBalance) - Number(after.body.data.availableBalance)).toBe(1000);
      expect(Number(after.body.data.reservedBalance) - Number(before.body.data.reservedBalance)).toBe(1000);
    });

    it('refuses to fund a campaign that costs more than the wallet holds, and leaves the wallet untouched', async () => {
      const poor = await api.registerApprovedMerchant(adminToken);
      await api.rechargeMerchant(poor, 500);
      const res = await api.post(`/merchants/${poor.merchantId}/campaigns`, poor.token).send(draft({ totalBudget: 1000 })).expect(201);
      const campaignId: string = res.body.data.id;
      await api.post(`/campaigns/${campaignId}/tasks`, poor.token).send({ title: 'Review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 }).expect(201);
      await api.post(`/campaigns/${campaignId}/submit`, poor.token).expect(200);
      await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);

      await api.post(`/merchants/${poor.merchantId}/campaigns/${campaignId}/fund`, poor.token).expect(400);

      const wallet = await api.get(`/merchants/${poor.merchantId}/wallet`, poor.token).expect(200);
      expect(Number(wallet.body.data.availableBalance)).toBe(500);
      expect(Number(wallet.body.data.reservedBalance)).toBe(0);
      const campaign = await api.get(`/campaigns/${campaignId}`, poor.token).expect(200);
      expect(campaign.body.data.status).not.toBe('ACTIVE');
    });
  });
});
