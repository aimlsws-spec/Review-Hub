import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Per-user completion limits (FR-016) against the real database: once-only tasks stay once-only, a daily task can be
 * done again the next IST day, and two submissions sent at the same moment can not both get through.
 */
describe('Task completion limits (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;

  /** An active campaign with one manually reviewed text task, using the given limit. Returns the task id. */
  const activeTask = async (limit: { completionLimit?: string; maxCompletionsPerPeriod?: number } = {}) => {
    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `Limits ${Date.now()}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount: 10,
        totalBudget: 500,
        maxParticipants: 20,
      })
      .expect(201);
    const campaignId: string = campaign.body.data.id;
    const task = await api
      .post(`/campaigns/${campaignId}/tasks`, merchant.token)
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 10, ...limit })
      .expect(201);
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
    return task.body.data.id as string;
  };

  const submit = (taskId: string, token: string) =>
    api.post(`/tasks/${taskId}/submit`, token).field('textAnswer', 'The coffee was great and the staff were friendly.');

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 10000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps a task once-only by default: an approved submission is final', async () => {
    const taskId = await activeTask();
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);

    const first = await submit(taskId, user.token).expect(201);
    await api.post(`/submissions/${first.body.data.id}/approve`, adminToken).expect(200);

    const again = await submit(taskId, user.token).expect(400);
    expect(again.body.message).toBe('You have already completed this task');
  });

  it('lets a daily task be done again the next day, and not before', async () => {
    const taskId = await activeTask({ completionLimit: 'DAILY', maxCompletionsPerPeriod: 1 });
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);

    const first = await submit(taskId, user.token).expect(201);
    await api.post(`/submissions/${first.body.data.id}/approve`, adminToken).expect(200);

    const sameDay = await submit(taskId, user.token).expect(400);
    expect(sameDay.body.message).toMatch(/once a day\. You can do it again after .* IST/);

    // As if the first one had been done yesterday.
    await prisma.taskSubmission.update({ where: { id: first.body.data.id }, data: { createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) } });
    await submit(taskId, user.token).expect(201);
  });

  it('lets only one of two simultaneous submissions through', async () => {
    const taskId = await activeTask({ completionLimit: 'DAILY', maxCompletionsPerPeriod: 5 });
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);

    const [a, b] = await Promise.all([submit(taskId, user.token), submit(taskId, user.token)]);

    expect([a.status, b.status].sort()).toEqual([201, 400]);
    expect(await prisma.taskSubmission.count({ where: { userId: user.id, taskId } })).toBe(1);
  });
});
