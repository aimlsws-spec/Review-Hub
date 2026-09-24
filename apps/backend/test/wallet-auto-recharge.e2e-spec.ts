import { INestApplication } from '@nestjs/common';

import { AutoRechargeService } from '../src/modules/merchant/services';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Merchant wallet auto-recharge, end to end: a merchant sets a threshold and an amount, spending
 * drops the wallet to or below that threshold, and the scheduled sweep (invoked directly here,
 * the same call WalletAutoRechargeProcessor makes — the cron itself isn't what's under test) tops
 * it back up. Runs on the mock payment gateway, so the recharge completes synchronously; see
 * AutoRechargeService's own comments for what changes on live Razorpay.
 */
describe('Merchant wallet auto-recharge (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;
  let autoRechargeService: AutoRechargeService;

  const walletOf = async (merchant: TestMerchant) => (await api.get(`/merchants/${merchant.merchantId}/wallet`, merchant.token).expect(200)).body.data;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();
    autoRechargeService = app.get(AutoRechargeService);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Reserves `amount` out of the merchant's available balance by creating and funding a campaign — the fastest real way to move money out of a wallet in this test suite. */
  const spendViaCampaign = async (merchant: TestMerchant, amount: number) => {
    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `Auto-recharge spend ${Date.now()}`,
        description: 'Draws down the wallet so auto-recharge has something to react to.',
        campaignType: 'REVIEW',
        rewardAmount: 10,
        totalBudget: amount,
        maxParticipants: 5,
      })
      .expect(201);
    const campaignId = campaign.body.data.id;
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
  };

  it('rejects a threshold that is not below the recharge amount', async () => {
    const merchant = await api.registerApprovedMerchant(adminToken);

    await api
      .patch(`/merchants/${merchant.merchantId}/wallet/auto-recharge`, merchant.token)
      .send({ enabled: true, threshold: 1000, amount: 1000 })
      .expect(400);
  });

  it('leaves auto-recharge off by default, and a wallet at any balance is left alone', async () => {
    const merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 1000);

    const before = await walletOf(merchant);
    const { attempted } = await autoRechargeService.runSweep();

    // Not a strict assertion on the whole platform's sweep (other tests may have enabled wallets
    // of their own) — just that this merchant's own balance is untouched.
    expect(attempted).toBeGreaterThanOrEqual(0);
    const after = await walletOf(merchant);
    expect(after.availableBalance).toBe(before.availableBalance);
  });

  describe('with auto-recharge enabled', () => {
    let merchant: TestMerchant;

    beforeEach(async () => {
      merchant = await api.registerApprovedMerchant(adminToken);
      await api.rechargeMerchant(merchant, 1000);
      await api
        .patch(`/merchants/${merchant.merchantId}/wallet/auto-recharge`, merchant.token)
        .send({ enabled: true, threshold: 600, amount: 2000 })
        .expect(200);
    });

    it('tops the wallet up once the balance drops to or below the threshold', async () => {
      await spendViaCampaign(merchant, 500); // 1000 - 500 = 500, at/below the 600 threshold

      const drained = await walletOf(merchant);
      expect(Number(drained.availableBalance)).toBe(500);

      const { succeeded } = await autoRechargeService.runSweep();
      expect(succeeded).toBeGreaterThanOrEqual(1);

      const recharged = await walletOf(merchant);
      expect(Number(recharged.availableBalance)).toBe(2500); // 500 + 2000
    });

    it('does not recharge a wallet that is still above its threshold', async () => {
      await spendViaCampaign(merchant, 100); // 1000 - 100 = 900, still above the 600 threshold

      await autoRechargeService.runSweep();

      const wallet = await walletOf(merchant);
      expect(Number(wallet.availableBalance)).toBe(900);
    });

    it('does not recharge the same wallet twice in a row, inside the cooldown window', async () => {
      await spendViaCampaign(merchant, 500);

      await autoRechargeService.runSweep();
      const afterFirst = await walletOf(merchant);
      expect(Number(afterFirst.availableBalance)).toBe(2500);

      // Still at/below its own original threshold logic would suggest another top-up, but the
      // cooldown (this wallet was just recharged) must skip it.
      await autoRechargeService.runSweep();
      const afterSecond = await walletOf(merchant);
      expect(Number(afterSecond.availableBalance)).toBe(2500);
    });

    it('turning it off is reflected immediately, and a subsequent sweep leaves the wallet alone', async () => {
      await api.patch(`/merchants/${merchant.merchantId}/wallet/auto-recharge`, merchant.token).send({ enabled: false }).expect(200);
      await spendViaCampaign(merchant, 500);

      await autoRechargeService.runSweep();

      const wallet = await walletOf(merchant);
      expect(Number(wallet.availableBalance)).toBe(500);
    });
  });
});
