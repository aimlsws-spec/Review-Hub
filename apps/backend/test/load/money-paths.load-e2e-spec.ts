import { INestApplication } from '@nestjs/common';

import { Api, TestMerchant, TestUser } from '../utils/api';
import { createTestApp } from '../utils/create-test-app';

/**
 * Load test (23 Sep 2026) — not a correctness spec like reward-and-withdrawal.e2e-spec.ts, which
 * already proves 3 simultaneous requests can't double-spend. This pushes the same money paths to a
 * higher, load-shaped concurrency and records real throughput/latency, per REPORT.md §6's own
 * conclusion: "mocked unit tests do not find these. Any new code that moves money needs an
 * end-to-end test that runs it concurrently" — this is that test, run at a load-testing scale
 * rather than a minimal reproduction scale.
 *
 * Runs against the safe throwaway `_test` database (see test/setup/safety.ts) — never real data.
 */

/** Transport-level failures a burst of brand-new, unpooled localhost connections can hit on this
 * harness (observed: supertest opens a fresh connection per call, no keep-alive) — confirmed by
 * running this suite repeatedly and finding zero matching server-side request logs for the
 * requests that failed this way, meaning they never reached the app. Not the money-path
 * correctness this test exists to check, so those specific errors get one retry; anything else
 * (a real 4xx/5xx or an assertion failure) is not retried and fails the test as it should. */
const CONNECTION_LEVEL_ERROR_CODES = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED'];

async function withConnectionRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string })?.code;
      const message = error instanceof Error ? error.message : String(error);
      const isConnectionLevel = CONNECTION_LEVEL_ERROR_CODES.some((c) => code === c || message.includes(c));
      if (!isConnectionLevel) throw error;
    }
  }
  throw lastError;
}

describe('Money paths under load (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;

  const walletOf = async (user: TestUser) => (await api.get('/wallet', user.token).expect(200)).body.data;

  const waitForBalance = async (user: TestUser, atLeast: number, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      // A connection-level error here just means "poll again next tick", same as balance not
      // having arrived yet — it isn't evidence of anything wrong with the balance itself.
      const wallet = await withConnectionRetry(() => walletOf(user));
      if (Number(wallet.availableBalance) >= atLeast) return wallet;
      if (Date.now() > deadline) throw new Error(`Balance stayed at ${wallet.availableBalance}, expected >= ${atLeast}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const waitForCampaign = async (campaignId: string, token: string, isReady: (c: { spentBudget: string }) => boolean, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      // GET /campaigns/:id is the owning-merchant view (matches reward-and-withdrawal.e2e-spec.ts) —
      // an admin token gets a 403 here, not the campaign.
      const campaign = (await withConnectionRetry(() => api.get(`/campaigns/${campaignId}`, token).expect(200))).body.data;
      if (isReady(campaign)) return campaign as { spentBudget: string };
      if (Date.now() > deadline) throw new Error(`Campaign budget did not settle: spent ${campaign.spentBudget}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('withdrawal contention — one wallet, many simultaneous requests', () => {
    // Concurrency the correctness suite doesn't reach (that one uses 3). High enough to actually
    // stress the row lock under real HTTP + connection-pool contention, not just prove the logic.
    const CONCURRENCY = 20;
    const BALANCE = 10000;
    const AMOUNT_PER_REQUEST = 1000;
    // Balance only covers this many of the CONCURRENCY requests — the rest must lose the race.
    const EXPECTED_SUCCESSES = BALANCE / AMOUNT_PER_REQUEST;

    it(`lets exactly ${EXPECTED_SUCCESSES} of ${CONCURRENCY} simultaneous withdrawal requests succeed, and the final balance is exactly correct`, async () => {
      const user = await api.registerUser();
      await api.fundWallet(user, BALANCE);
      await api.approvePan(user, adminToken);
      const bankAccountId = await api.addBankAccount(user);

      const start = Date.now();
      const responses = await Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
          api.post('/withdrawals', user.token).send({ amount: AMOUNT_PER_REQUEST, bankAccountId }),
        ),
      );
      const elapsedMs = Date.now() - start;

      const succeeded = responses.filter((r) => r.status === 201);
      const rejected = responses.filter((r) => r.status !== 201);

      // eslint-disable-next-line no-console
      console.log(
        `[load] withdrawal contention: ${CONCURRENCY} concurrent requests in ${elapsedMs}ms ` +
          `(${(CONCURRENCY / (elapsedMs / 1000)).toFixed(1)} req/s) — ${succeeded.length} succeeded, ${rejected.length} correctly refused`,
      );

      expect(succeeded).toHaveLength(EXPECTED_SUCCESSES);
      const wallet = await walletOf(user);
      expect(Number(wallet.availableBalance)).toBe(0);
      expect(Number(wallet.lockedBalance)).toBe(BALANCE);
    }, 45000);
  });

  describe('reward crediting under load — many different users, one shared campaign budget', () => {
    // Different wallets, different rows, but they all debit the *same* campaign's budget field
    // concurrently — a different contention shape than the single-wallet test above.
    const USER_COUNT = 20;
    const REWARD_AMOUNT = 50;
    let merchant: TestMerchant;
    let campaignId: string;
    let taskId: string;

    beforeAll(async () => {
      merchant = await api.registerApprovedMerchant(adminToken);
      await api.rechargeMerchant(merchant, 50000);

      const campaign = await api
        .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
        .send({
          title: `Load test rewards ${Date.now()}`,
          description: 'Share your honest experience after visiting our cafe this week.',
          campaignType: 'REVIEW',
          rewardAmount: REWARD_AMOUNT,
          totalBudget: 5000,
          maxParticipants: USER_COUNT + 10,
        })
        .expect(201);
      campaignId = campaign.body.data.id;

      const task = await api
        .post(`/campaigns/${campaignId}/tasks`, merchant.token)
        .send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: REWARD_AMOUNT })
        .expect(201);
      taskId = task.body.data.id;

      await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
      await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
      await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
    }, 60000);

    it(`pays exactly ${USER_COUNT} concurrent users their reward once each, and debits the shared campaign budget exactly ${USER_COUNT} times`, async () => {
      // allSettled rather than all: a partial failure should be reported with a useful count and
      // reason, not just "one of N promises rejected" with the other N-1 results thrown away.
      const registerResults = await Promise.allSettled(
        Array.from({ length: USER_COUNT }, () => withConnectionRetry(() => api.registerUser())),
      );
      const registerFailures = registerResults.filter((r) => r.status === 'rejected');
      if (registerFailures.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[load] ${registerFailures.length}/${USER_COUNT} registrations failed:`, registerFailures.map((r) => (r as PromiseRejectedResult).reason?.message ?? r));
      }
      expect(registerFailures).toHaveLength(0);
      const users = registerResults.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<TestUser>).value);

      const start = Date.now();
      const submissionResults = await Promise.allSettled(
        users.map((user) =>
          withConnectionRetry(async () => {
            await api.post(`/tasks/${taskId}/start`, user.token).expect(200);
            const submitted = await api
              .post(`/tasks/${taskId}/submit`, user.token)
              .field('textAnswer', 'The coffee was great and the staff were friendly.')
              .expect(201);
            return submitted.body.data.id as string;
          }),
        ),
      );
      const submissionFailures = submissionResults.filter((r) => r.status === 'rejected');
      if (submissionFailures.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[load] ${submissionFailures.length}/${users.length} start+submit calls failed:`, submissionFailures.map((r) => (r as PromiseRejectedResult).reason?.message ?? r));
      }
      expect(submissionFailures).toHaveLength(0);
      const submissionIds = submissionResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<string>).value);
      const submitElapsedMs = Date.now() - start;

      // Approvals concurrently too — this is the step that actually triggers reward crediting.
      const approveStart = Date.now();
      await Promise.all(submissionIds.map((id) => withConnectionRetry(() => api.post(`/submissions/${id}/approve`, adminToken).expect(200))));
      const approveElapsedMs = Date.now() - approveStart;

      // Rewards are paid by a background worker; wait for every user's wallet to reflect it.
      await Promise.all(users.map((user) => waitForBalance(user, REWARD_AMOUNT)));
      const totalElapsedMs = Date.now() - start;

      // eslint-disable-next-line no-console
      console.log(
        `[load] reward crediting: ${USER_COUNT} users — submit ${submitElapsedMs}ms, approve ${approveElapsedMs}ms, ` +
          `total incl. worker settle ${totalElapsedMs}ms (${(USER_COUNT / (totalElapsedMs / 1000)).toFixed(1)} rewards/s)`,
      );

      for (const user of users) {
        const wallet = await walletOf(user);
        expect(Number(wallet.availableBalance)).toBe(REWARD_AMOUNT);
      }

      const campaign = await waitForCampaign(campaignId, merchant.token, (c) => Number(c.spentBudget) === REWARD_AMOUNT * USER_COUNT);
      expect(Number(campaign.spentBudget)).toBe(REWARD_AMOUNT * USER_COUNT);
    }, 90000);
  });
});
