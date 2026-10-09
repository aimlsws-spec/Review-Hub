import { INestApplication } from '@nestjs/common';

import { Api, TestMerchant } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * QA: "Choose sort by Nearest; allow location when asked. Campaigns sort by distance; merchants without store
 * coordinates appear last." This is the server half, run for real: merchants save their store location on their
 * profile, and the public list sorts by distance from the phone's position. The test database keeps earlier runs, so
 * the list is narrowed to this run's campaigns by a title only they share.
 */
describe('Sorting campaigns by nearest (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let adminToken: string;

  const token = `nearest${Date.now()}`;
  // The phone is at Ahmedabad's Law Garden.
  const phone = { latitude: 23.0262, longitude: 72.5603 };
  const stores = {
    near: { latitude: 23.0396, longitude: 72.5661 }, // Navrangpura, about 1.6 km away
    far: { latitude: 21.1702, longitude: 72.8311 }, // Surat, about 208 km away
  };
  const ids: Record<'near' | 'far' | 'noLocation', string> = {} as never;

  const campaignFor = async (merchant: TestMerchant, name: string): Promise<string> => {
    const created = await api
      .post(`/merchants/${merchant.merchantId}/campaigns`, merchant.token)
      .send({
        title: `${token} ${name}`,
        description: 'Share your honest experience after visiting our cafe this week.',
        campaignType: 'REVIEW',
        rewardAmount: 40,
        totalBudget: 2000,
      })
      .expect(201);
    const campaignId = created.body.data.id as string;
    await api.post(`/campaigns/${campaignId}/tasks`, merchant.token).send({ title: 'Upload your bill', taskType: 'SCREENSHOT', verificationType: 'MANUAL', rewardAmount: 40 }).expect(201);
    await api.post(`/campaigns/${campaignId}/submit`, merchant.token).expect(200);
    await api.post(`/admin/campaigns/${campaignId}/approve`, adminToken).send({}).expect(200);
    await api.post(`/merchants/${merchant.merchantId}/campaigns/${campaignId}/fund`, merchant.token).expect(200);
    return campaignId;
  };

  const merchantAt = async (location?: { latitude: number; longitude: number }) => {
    const merchant = await api.registerApprovedMerchant(adminToken);
    await api.rechargeMerchant(merchant, 5000);
    if (location) await api.patch(`/merchants/${merchant.merchantId}`, merchant.token).send(location).expect(200);
    return merchant;
  };

  type Row = { id: string; distanceMeters: number | null };
  const nearest = async () =>
    (await api.get(`/campaigns?search=${token}&limit=50&sort=nearest&latitude=${phone.latitude}&longitude=${phone.longitude}`).expect(200)).body
      .data.data as Row[];

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    adminToken = await api.adminToken();

    // Created far first and near last, so "newest first" would give the opposite order: only distance can explain the result.
    ids.noLocation = await campaignFor(await merchantAt(), 'no store location');
    ids.far = await campaignFor(await merchantAt(stores.far), 'far store');
    ids.near = await campaignFor(await merchantAt(stores.near), 'near store');
  }, 180000);

  afterAll(async () => {
    await app.close();
  });

  it('lists the nearest store first and a store with no location last', async () => {
    const rows = await nearest();

    expect(rows.map((row) => row.id)).toEqual([ids.near, ids.far, ids.noLocation]);
  });

  it('says how far each store is, and nothing for a store with no location', async () => {
    const byId = new Map((await nearest()).map((row) => [row.id, row.distanceMeters]));

    expect(byId.get(ids.near)).toBeGreaterThan(1000);
    expect(byId.get(ids.near)).toBeLessThan(2500);
    expect(byId.get(ids.far)).toBeGreaterThan(190000);
    expect(byId.get(ids.far)).toBeLessThan(230000);
    expect(byId.get(ids.noLocation)).toBeNull();
  });

  it('needs the phone position to sort by nearest', async () => {
    await api.get(`/campaigns?search=${token}&sort=nearest`).expect(400);
  });

  it('refuses half a store location on the merchant profile', async () => {
    const merchant = await api.registerApprovedMerchant(adminToken);

    await api.patch(`/merchants/${merchant.merchantId}`, merchant.token).send({ latitude: 23.03 }).expect(400);
    await api.patch(`/merchants/${merchant.merchantId}`, merchant.token).send({ latitude: 95, longitude: 72 }).expect(422);
  });
});
