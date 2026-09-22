import { INestApplication } from '@nestjs/common';

import { Api, TestMerchant, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * What the app's task list and detail page rely on: the new sort orders, and one campaign fetched by id without being
 * its owner. The test database keeps what earlier runs left behind, so every list here is narrowed to this run's
 * campaigns by a title that only they share.
 */
describe('Browsing campaigns (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;
  let merchant: TestMerchant;
  let user: TestUser;

  const token = `browse${Date.now()}`;
  const day = 24 * 60 * 60 * 1000;
  const ids: Record<'cheapLate' | 'richOpen' | 'mediumSoon', string> = {} as never;
  let draftId: string;

  const createCampaign = async (name: string, rewardAmount: number, endAt?: Date): Promise<string> => {
    const res = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `${token} ${name}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount,
        totalBudget: 2000,
        maxParticipants: 50,
        ...(endAt ? { endAt: endAt.toISOString() } : {}),
      })
      .expect(201);
    return res.body.data.id;
  };

  const activate = async (campaignId: string, rewardAmount: number) => {
    await api.post(`/campaigns/${campaignId}/tasks`, merchant.token).send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount }).expect(201);
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
  };

  const browse = async (query: string) => (await api.get(`/campaigns?search=${token}&limit=50&${query}`).expect(200)).body.data.data as { id: string }[];
  const idsOf = (rows: { id: string }[]) => rows.map((row) => row.id);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();
    merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 20000);
    user = await api.registerUser();

    // Created one after the other, so "newest" has a clear order: cheapLate, richOpen, mediumSoon, oldest first.
    ids.cheapLate = await createCampaign('cheap and late', 30, new Date(Date.now() + 5 * day));
    ids.richOpen = await createCampaign('rich and open', 90);
    ids.mediumSoon = await createCampaign('medium and soon', 60, new Date(Date.now() + 1 * day));
    await activate(ids.cheapLate, 30);
    await activate(ids.richOpen, 90);
    await activate(ids.mediumSoon, 60);

    // Never submitted, so it stays a draft and must never be visible to the public.
    draftId = await createCampaign('draft', 500);
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  describe('sorting', () => {
    it('lists the biggest reward first', async () => {
      const rows = await browse('sort=highest_reward');

      expect(idsOf(rows)).toEqual([ids.richOpen, ids.mediumSoon, ids.cheapLate]);
    });

    it('lists what ends soonest first, and leaves out a campaign with no end date', async () => {
      const rows = await browse('sort=ending_soon');

      expect(idsOf(rows)).toEqual([ids.mediumSoon, ids.cheapLate]);
    });

    it('lists the newest first', async () => {
      const rows = await browse('sort=newest');

      expect(idsOf(rows)).toEqual([ids.mediumSoon, ids.richOpen, ids.cheapLate]);
    });

    it('still works with the sorts it already had', async () => {
      expect(await browse('sort=featured')).toHaveLength(3);
      expect(await browse('sort=popular')).toHaveLength(3);
      expect(await browse('')).toHaveLength(3);
    });

    it('combines a sort with a type filter, and finds nothing for a type none of them are', async () => {
      expect(idsOf(await browse('sort=highest_reward&campaignType=REVIEW'))).toEqual([ids.richOpen, ids.mediumSoon, ids.cheapLate]);
      expect(await browse('sort=highest_reward&campaignType=SURVEY')).toEqual([]);
    });

    it('never shows a draft in any sort', async () => {
      for (const sort of ['featured', 'popular', 'newest', 'highest_reward', 'ending_soon']) {
        expect(idsOf(await browse(`sort=${sort}`))).not.toContain(draftId);
      }
    });

    it.each(['sort=cheapest', 'sort=', 'sort=HIGHEST_REWARD'])('refuses %s', async (query) => {
      await api.get(`/campaigns?${query}`).expect(422);
    });
  });

  describe('one campaign', () => {
    it('is public, and shows an active campaign to anyone', async () => {
      const res = await api.get(`/campaigns/${ids.richOpen}/details`).expect(200);

      expect(res.body.data).toMatchObject({ id: ids.richOpen, title: `${token} rich and open` });
    });

    it('is the same for a signed-in user who does not own it', async () => {
      await api.get(`/campaigns/${ids.mediumSoon}/details`, user.token).expect(200);
    });

    it('is refused as not found for a draft, so it can not be used to peek at unpublished campaigns', async () => {
      await api.get(`/campaigns/${draftId}/details`).expect(404);
      await api.get(`/campaigns/${draftId}/details`, user.token).expect(404);
    });

    it('is not found for an id that does not exist, and refused for one that is not an id at all', async () => {
      await api.get('/campaigns/11111111-1111-4111-8111-111111111111/details').expect(404);
      await api.get('/campaigns/not-an-id/details').expect(400);
    });

    it('does not open the owner-only campaign endpoint to an ordinary user', async () => {
      await api.get(`/campaigns/${ids.richOpen}`, user.token).expect(403);
    });
  });
});
