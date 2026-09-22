import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { SubmissionService } from '../src/modules/task/services/submission.service';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * A submission is decided once. The automatic check and a reviewer can both find one open at the same moment, and what
 * must never happen is the late one undoing the earlier: an approval that has already paid a reward turning back into
 * "waiting for review", or a rejection that the user was told about coming back to the queue.
 */
describe('Submission decisions (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let submissions: SubmissionService;
  let adminToken: string;
  let merchant: TestMerchant;
  let taskId: string;

  const submit = async (): Promise<string> => {
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
    const res = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'The coffee was great and the staff were friendly.').expect(201);
    return res.body.data.id;
  };
  const statusOf = async (id: string) => (await prisma.taskSubmission.findUniqueOrThrow({ where: { id } })).status;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    submissions = app.get(SubmissionService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);

    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({ title: `E2E decisions ${Date.now()}`, description: 'Share your honest experience after visiting our cafe this week.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 5000, maxParticipants: 200 })
      .expect(201);
    const task = await api.post(`/campaigns/${campaign.body.data.id}/tasks`, merchant.token).send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 }).expect(201);
    taskId = task.body.data.id;
    await api.post(`/campaigns/${campaign.body.data.id}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaign.body.data.id}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaign.body.data.id}/fund`, merchant.token).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('an automatic check that finishes after a reviewer approved does not undo the approval', async () => {
    const id = await submit();
    await api.post(`/submissions/${id}/approve`, adminToken).expect(200);

    await expect(submissions.deferToManualReview(id)).rejects.toThrow(/already approved/);

    expect(await statusOf(id)).toBe('APPROVED');
  });

  it('nor does it undo a rejection', async () => {
    const id = await submit();
    await api.post(`/submissions/${id}/reject`, adminToken).send({ rejectionReason: 'The screenshot does not show the review.' }).expect(200);

    await expect(submissions.deferToManualReview(id)).rejects.toThrow(/already rejected/);

    expect(await statusOf(id)).toBe('REJECTED');
  });

  it('when a reviewer and the automatic check act at the same moment, the reviewer’s decision is the one that stands', async () => {
    for (let round = 0; round < 6; round += 1) {
      const id = await submit();

      const [approval] = await Promise.allSettled([api.post(`/submissions/${id}/approve`, adminToken), submissions.deferToManualReview(id)]);

      const approved = approval.status === 'fulfilled' && approval.value.status === 200;
      // If the approval was accepted, nothing may have turned it back into "waiting for review".
      if (approved) expect(await statusOf(id)).toBe('APPROVED');
    }
  });

  it('two reviewers deciding at the same moment: one wins and the other is told it is already decided', async () => {
    const id = await submit();

    const results = await Promise.all([
      api.post(`/submissions/${id}/approve`, adminToken),
      api.post(`/submissions/${id}/reject`, adminToken).send({ rejectionReason: 'The screenshot does not show the review.' }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(['APPROVED', 'REJECTED']).toContain(await statusOf(id));
  });

  it('approving the same submission several times at once approves it once and moves the participant on once', async () => {
    const id = await submit();

    const results = await Promise.all([1, 2, 3, 4].map(() => api.post(`/submissions/${id}/approve`, adminToken)));

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const submission = await prisma.taskSubmission.findUniqueOrThrow({ where: { id }, include: { participant: true } });
    expect(submission.participant.tasksCompleted).toBe(1);
  });
});
