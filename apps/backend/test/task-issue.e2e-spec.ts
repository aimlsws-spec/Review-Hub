import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * "Report an issue" on a task opens a support ticket linked to the task, and to one of the reporter's own
 * submissions when given. Nobody can link a ticket to someone else's submission, by this route or the ticket form.
 */
describe('Task issue reports (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;
  let taskId: string;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 5000);

    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `Issue reports ${Date.now()}`,
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
      .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 10 })
      .expect(201);
    taskId = task.body.data.id;
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  const submitAs = async (token: string) => {
    await api.post(`/tasks/${taskId}/start`, token).expect(200);
    const res = await api.post(`/tasks/${taskId}/submit`, token).field('textAnswer', 'The coffee was great and the staff were friendly.').expect(201);
    return res.body.data.id as string;
  };

  it('opens a task-issue ticket linked to the task', async () => {
    const user = await api.registerUser();

    const res = await api.post(`/tasks/${taskId}/report-issue`, user.token).send({ description: 'The task link is broken and returns 404.' }).expect(201);

    const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(ticket).toMatchObject({ userId: user.id, campaignTaskId: taskId, submissionId: null, category: 'TASK_ISSUE', status: 'OPEN' });
  });

  it("links the reporter's own submission, and refuses someone else's", async () => {
    const owner = await api.registerUser();
    const other = await api.registerUser();
    const submissionId = await submitAs(owner.token);

    const mine = await api
      .post(`/tasks/${taskId}/report-issue`, owner.token)
      .send({ description: 'My proof was marked wrong by mistake.', submissionId })
      .expect(201);
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id: mine.body.data.id } })).submissionId).toBe(submissionId);

    await api
      .post(`/tasks/${taskId}/report-issue`, other.token)
      .send({ description: 'Trying to attach a ticket to this one.', submissionId })
      .expect(404);
  });

  it('does not let the ordinary ticket form set task or submission links', async () => {
    const user = await api.registerUser();

    await api
      .post('/support/tickets', user.token)
      .send({ subject: 'Help', description: 'Something is broken here.', campaignTaskId: taskId })
      .expect(422);
  });

  it('refuses a description too short to act on', async () => {
    const user = await api.registerUser();

    await api.post(`/tasks/${taskId}/report-issue`, user.token).send({ description: 'broken' }).expect(422);
  });
});
