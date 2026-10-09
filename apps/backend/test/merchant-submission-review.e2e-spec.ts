import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, PNG, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * A merchant reviews the submissions to their own campaigns: sees each one with its evidence, approves (which pays the
 * reward) or rejects with a reason. Another merchant can not see or decide them.
 */
describe('Merchant submission review (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;
  let otherMerchant: TestMerchant;
  let campaignId: string;
  let taskId: string;

  const base = () => `/merchants/${merchant.merchantId}/submissions`;

  const submitLink = async (): Promise<string> => {
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
    const res = await api.post(`/tasks/${taskId}/submit`, user.token).field('externalUrl', 'https://www.instagram.com/p/viralkar-proof/').expect(201);
    return res.body.data.id;
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    otherMerchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);

    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({ title: `E2E review ${Date.now()}`, description: 'Share your honest experience after visiting our cafe this week.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 5000, maxParticipants: 200 })
      .expect(201);
    campaignId = campaign.body.data.id;
    const task = await api
      .post(`/campaigns/${campaignId}/tasks`, merchant.token)
      .send({ title: 'Share your post', taskType: 'URL', verificationType: 'MANUAL', proofType: 'URL', rewardAmount: 50 })
      .expect(201);
    taskId = task.body.data.id;
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists a submission waiting for the merchant, with what they need and nothing more about the person', async () => {
    const id = await submitLink();

    const res = await api.get(`${base()}?status=PENDING_MANUAL&campaignId=${campaignId}`, merchant.token).expect(200);
    const row = res.body.data.data.find((submission: { id: string }) => submission.id === id);

    expect(row).toMatchObject({
      status: 'PENDING_MANUAL',
      campaign: { id: campaignId },
      task: { id: taskId, title: 'Share your post', verificationType: 'MANUAL' },
      participantName: 'E2E P.',
      evidence: { file: null, link: 'https://www.instagram.com/p/viralkar-proof/' },
      ai: null,
    });
    expect(row).not.toHaveProperty('userId');
    expect(JSON.stringify(row)).not.toMatch(/@example\.com/);
  });

  it('approves a submission, which pays the reward and records the merchant as the one who decided', async () => {
    const id = await submitLink();

    const res = await api.post(`${base()}/${id}/approve`, merchant.token).expect(200);

    expect(res.body.data).toMatchObject({ id, status: 'APPROVED', rewardAmount: 50 });
    const audit = await prisma.auditLog.findFirst({ where: { entity: 'TaskSubmission', entityId: id, action: 'APPROVE' } });
    expect(audit?.actorType).toBe('MERCHANT');
    expect(audit?.actorId).toBe(merchant.id);
  });

  it('rejects a submission with the reason the participant is shown, and can not decide it twice', async () => {
    const id = await submitLink();

    const res = await api.post(`${base()}/${id}/reject`, merchant.token).send({ rejectionReason: 'The link does not show our post.' }).expect(200);

    expect(res.body.data).toMatchObject({ status: 'REJECTED', rejectionReason: 'The link does not show our post.' });
    await api.post(`${base()}/${id}/approve`, merchant.token).expect(400);
  });

  it('shows the uploaded proof file to the merchant', async () => {
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
    const submitted = await api
      .post(`/tasks/${taskId}/submit`, user.token)
      .attach('file', PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(201);
    const id = submitted.body.data.id;

    const detail = await api.get(`${base()}/${id}`, merchant.token).expect(200);
    expect(detail.body.data.evidence.file).toEqual({ mimeType: 'image/png', fileName: 'proof.png' });

    const file = await api.get(`${base()}/${id}/evidence`, merchant.token).expect(200);
    expect(file.headers['content-type']).toMatch(/image\/png/);
  });

  it("does not let another merchant see or decide this merchant's submissions", async () => {
    const id = await submitLink();
    const otherBase = `/merchants/${otherMerchant.merchantId}/submissions`;

    const list = await api.get(otherBase, otherMerchant.token).expect(200);
    expect(list.body.data.data.map((submission: { id: string }) => submission.id)).not.toContain(id);
    await api.get(`${otherBase}/${id}`, otherMerchant.token).expect(404);
    await api.get(`${otherBase}/${id}/evidence`, otherMerchant.token).expect(404);
    await api.post(`${otherBase}/${id}/approve`, otherMerchant.token).expect(404);
    // Nor through this merchant's address with their own token.
    await api.post(`${base()}/${id}/approve`, otherMerchant.token).expect(403);

    expect((await prisma.taskSubmission.findUniqueOrThrow({ where: { id } })).status).toBe('PENDING_MANUAL');
  });
});
