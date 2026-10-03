import { INestApplication } from '@nestjs/common';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/** Saved campaigns live on the server, per person, so the list follows them to another phone. */
describe('Saved campaigns (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;
  let merchant: TestMerchant;

  /** An active, public campaign. Returns its id. */
  const activeCampaign = async () => {
    const campaign = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `Saved ${Date.now()}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount: 10,
        totalBudget: 100,
        maxParticipants: 10,
      })
      .expect(201);
    const id: string = campaign.body.data.id;
    await api.post(`/campaigns/${id}/tasks`, merchant.token).send({ title: 'Write an honest review', taskType: 'TEXT', verificationType: 'MANUAL', rewardAmount: 10 }).expect(201);
    await api.post(`/campaigns/${id}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${id}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${id}/fund`, merchant.token).expect(200);
    return id;
  };

  const put = (path: string, token: string) => api.http().put(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const del = (path: string, token: string) => api.http().delete(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);

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

  it('saves, lists newest first, and removes, for each person separately', async () => {
    const [first, second] = [await activeCampaign(), await activeCampaign()];
    const user = await api.registerUser();
    const someoneElse = await api.registerUser();

    await put(`/users/me/saved-campaigns/${first}`, user.token).expect(200);
    const afterSecond = await put(`/users/me/saved-campaigns/${second}`, user.token).expect(200);
    expect(afterSecond.body.data.campaignIds).toEqual([second, first]);

    // Saving twice changes nothing.
    await put(`/users/me/saved-campaigns/${second}`, user.token).expect(200);
    expect((await api.get('/users/me/saved-campaigns', user.token).expect(200)).body.data.campaignIds).toEqual([second, first]);

    expect((await api.get('/users/me/saved-campaigns', someoneElse.token).expect(200)).body.data.campaignIds).toEqual([]);

    const afterRemove = await del(`/users/me/saved-campaigns/${first}`, user.token).expect(200);
    expect(afterRemove.body.data.campaignIds).toEqual([second]);
  });

  it('refuses a campaign nobody can see', async () => {
    const user = await api.registerUser();

    await put('/users/me/saved-campaigns/00000000-0000-4000-8000-000000000000', user.token).expect(404);
  });

  it('imports the list a phone kept locally, skipping what no longer exists', async () => {
    const campaign = await activeCampaign();
    const user = await api.registerUser();

    const res = await api
      .post('/users/me/saved-campaigns/import', user.token)
      .send({ campaignIds: [campaign, '00000000-0000-4000-8000-000000000000'] })
      .expect(200);

    expect(res.body.data.campaignIds).toEqual([campaign]);
  });
});
