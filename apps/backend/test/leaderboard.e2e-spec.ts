import { INestApplication } from '@nestjs/common';

import { getIstMonthBoundaries } from '../src/common/utils/date.util';
import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestMerchant, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * The ranking is counted from real rewards, so these tests earn real ones and then set the amounts.
 *
 * The test database keeps what earlier runs left behind, so the amounts here start from a number that grows every
 * minute. Everything this run creates then sits above everything an earlier run created, and the top of the board is
 * this run's people, in a known order, whatever else is in the table.
 */
describe('Leaderboard (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;
  let merchant: TestMerchant;
  let taskId: string;

  // Each run's amounts are base + 0..99, and the next run's base is at least 100 higher.
  const base = Math.floor(Date.now() / 60000) * 100;

  const people: Record<'top' | 'second' | 'tieOne' | 'tieTwo' | 'hidden' | 'older' | 'reversed' | 'suspended' | 'points' | 'small' | 'none', TestUser> = {} as never;

  /** The reward is paid by a background worker in two steps; wait for both so nothing changes under the test afterwards. */
  const waitForPaid = async (userId: string, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const reward = await prisma.reward.findFirst({ where: { userId, status: 'CREDITED' } });
      const charged = reward ? await prisma.walletTransaction.count({ where: { type: 'SPEND', referenceType: 'Reward', referenceId: reward.id, status: 'SUCCESS' } }) : 0;
      if (reward && charged > 0) return reward;
      if (Date.now() > deadline) throw new Error(`The reward for ${userId} was not paid in time`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  /** A person with one paid reward, whose amount is then set to [total] (or left as the real 50). */
  const earner = async (total?: number): Promise<TestUser> => {
    const user = await api.registerUser();
    await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
    const submitted = await api.post(`/tasks/${taskId}/submit`, user.token).field('textAnswer', 'The coffee was great and the staff were friendly.').expect(201);
    await api.post(`/submissions/${submitted.body.data.id}/approve`, adminToken).expect(200);
    await waitForPaid(user.id);
    if (total !== undefined) await prisma.reward.updateMany({ where: { userId: user.id }, data: { amount: total } });
    return user;
  };

  const board = async (user: TestUser, query = '') => (await api.get(`/leaderboard${query}`, user.token).expect(200)).body.data;
  const totals = (view: { entries: { totalEarned: number }[] }) => view.entries.map((entry) => entry.totalEarned);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);

    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({ title: `E2E leaderboard ${Date.now()}`, description: 'Share your honest experience after visiting our cafe this week.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 5000, maxParticipants: 200 })
      .expect(201);
    const task = await api.post(`/campaigns/${campaign.body.data.id}/tasks`, merchant.token).send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 50 }).expect(201);
    taskId = task.body.data.id;
    await api.post(`/campaigns/${campaign.body.data.id}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaign.body.data.id}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaign.body.data.id}/fund`, merchant.token).expect(200);

    people.top = await earner(base + 30);
    people.second = await earner(base + 20);
    people.tieOne = await earner(base + 10);
    people.tieTwo = await earner(base + 10);
    people.hidden = await earner(base + 90);
    people.older = await earner(base + 80);
    people.reversed = await earner(base + 70);
    people.suspended = await earner(base + 60);
    people.points = await earner(base + 50);
    people.small = await earner();
    people.none = await api.registerUser();

    // Not the month's board: paid 40 days ago.
    await prisma.reward.updateMany({ where: { userId: people.older.id }, data: { creditedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } });
    // Not counted at all: taken back, from someone who is blocked, and not money.
    await prisma.reward.updateMany({ where: { userId: people.reversed.id }, data: { status: 'REVERSED' } });
    await prisma.user.update({ where: { id: people.suspended.id }, data: { status: 'SUSPENDED' } });
    await prisma.reward.updateMany({ where: { userId: people.points.id }, data: { rewardType: 'POINTS' } });
    // Signing up does not verify anyone, and an unverified person is a normal member; make that explicit for the person on top.
    await prisma.user.update({ where: { id: people.top.id }, data: { status: 'PENDING_VERIFICATION' } });

    await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: false }).expect(200);
  }, 120000);

  afterAll(async () => {
    // Leave the one hidden person hidden, as they found the board.
    await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: false });
    await app.close();
  });

  describe('this month', () => {
    it('ranks the biggest earners first, with people on the same total sharing a rank', async () => {
      const view = await board(people.top, '?limit=50');

      expect(totals(view).slice(0, 4)).toEqual([base + 30, base + 20, base + 10, base + 10]);
      expect(view.entries.slice(0, 4).map((entry: { rank: number }) => entry.rank)).toEqual([1, 2, 3, 3]);
    });

    it('shows a first name and an initial, marks the viewer, and reveals no ids or contact details', async () => {
      const view = await board(people.second, '?limit=50');

      expect(view.entries[1]).toMatchObject({ displayName: 'E2E P.', isMe: true });
      expect(view.entries[0].isMe).toBe(false);
      const everything = JSON.stringify(view);
      for (const person of Object.values(people)) {
        expect(everything).not.toContain(person.id);
        expect(everything).not.toContain(person.email);
      }
      expect(Object.keys(view.entries[0]).sort()).toEqual(['avatarUrl', 'displayName', 'isMe', 'rank', 'totalEarned']);
    });

    it('counts an account that has not verified its email or phone', async () => {
      const view = await board(people.top);
      expect(view.me).toEqual({ visible: true, rank: 1, totalEarned: base + 30 });
    });

    it('leaves out a reward that was paid last month, one that was taken back, a blocked person, and points', async () => {
      const view = await board(people.top, '?limit=50');

      for (const excluded of [base + 80, base + 70, base + 60, base + 50]) expect(totals(view)).not.toContain(excluded);
    });

    it('says when the month starts over', async () => {
      const view = await board(people.top);
      expect(view.period).toBe('month');
      expect(view.resetsAt).toBe(getIstMonthBoundaries().end.toISOString());
    });

    it('tells someone below the list where they stand, worked out the same way from the data', async () => {
      const view = await board(people.small, '?limit=1');

      const { start, end } = getIstMonthBoundaries();
      const ahead = await prisma.reward.groupBy({
        by: ['userId'],
        where: { status: 'CREDITED', rewardType: 'CASH', deletedAt: null, creditedAt: { gte: start, lt: end }, user: { hideFromLeaderboard: false, deletedAt: null, status: { notIn: ['SUSPENDED', 'BANNED', 'DEACTIVATED'] } } },
        having: { amount: { _sum: { gt: 50 } } },
      });

      expect(view.entries).toHaveLength(1);
      expect(view.me.totalEarned).toBe(50);
      expect(view.me.rank).toBe(ahead.length + 1);
      expect(view.me.rank).toBeGreaterThan(4);
    });

    it('does not rank someone who has earned nothing', async () => {
      expect((await board(people.none)).me).toEqual({ visible: true, rank: null, totalEarned: 0 });
    });
  });

  describe('all time', () => {
    it('includes what was paid in earlier months, and never resets', async () => {
      const view = await board(people.top, '?period=all_time&limit=50');

      expect(totals(view).slice(0, 5)).toEqual([base + 80, base + 30, base + 20, base + 10, base + 10]);
      expect(view.resetsAt).toBeNull();
      expect(view.me.rank).toBe(2);
    });
  });

  describe('staying off the board', () => {
    it('does not show a hidden person to anyone, or rank them', async () => {
      const seenByOthers = await board(people.top, '?limit=50');
      const seenByThemselves = await board(people.hidden, '?limit=50');

      expect(totals(seenByOthers)).not.toContain(base + 90);
      expect(totals(seenByThemselves)).not.toContain(base + 90);
      expect(seenByThemselves.me).toEqual({ visible: false, rank: null, totalEarned: 0 });
    });

    it('lets them back on, and only then are they ranked, above the rest', async () => {
      await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: true }).expect(200).expect((res) => expect(res.body.data).toEqual({ visible: true }));

      const view = await board(people.hidden, '?limit=50');
      expect(view.me).toEqual({ visible: true, rank: 1, totalEarned: base + 90 });
      expect(view.entries[0]).toMatchObject({ totalEarned: base + 90, isMe: true });
      expect((await board(people.top)).me.rank).toBe(2);

      await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: false }).expect(200);
      expect((await board(people.top)).me.rank).toBe(1);
    });

    it('is harmless to ask for what is already true', async () => {
      await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: false }).expect(200);
      await api.patch('/leaderboard/me/visibility', people.hidden.token).send({ visible: false }).expect(200);
    });
  });

  describe('what is refused', () => {
    it.each(['?period=week', '?limit=51', '?limit=0', '?limit=abc'])('rejects %s', async (query) => {
      await api.get(`/leaderboard${query}`, people.top.token).expect(422);
    });

    it('needs a signed-in user', async () => {
      await api.get('/leaderboard').expect(401);
      await api.patch('/leaderboard/me/visibility').send({ visible: false }).expect(401);
    });

    it.each([{ visible: 'yes' }, {}, { visible: false, extra: 1 }])('rejects the visibility body %j', async (body) => {
      await api.patch('/leaderboard/me/visibility', people.top.token).send(body).expect(422);
    });
  });
});
