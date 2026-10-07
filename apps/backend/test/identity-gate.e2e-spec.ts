import { INestApplication } from '@nestjs/common';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Owner's rule (7 Oct 2026): the earning features stay locked until the person uploads PAN or an identity document.
 * An upload unlocks them straight away, while it waits for review.
 */
describe('Identity verification gate (e2e)', () => {
  let app: INestApplication;
  let api: Api;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses earning features until an identity document is uploaded, then lets them through', async () => {
    const user = await api.registerUser({ withIdentity: false });

    const locked = await api.post('/gamification/daily-reward/claim', user.token).expect(403);
    expect(locked.body.code).toBe('IDENTITY_VERIFICATION_REQUIRED');
    expect(locked.body.message).toMatch(/identity verification/i);

    const bank = await api.post('/wallet/bank-accounts', user.token).send({}).expect(403);
    expect(bank.body.code).toBe('IDENTITY_VERIFICATION_REQUIRED');

    await api.uploadIdentityDocument(user);

    const unlocked = await api.post('/gamification/daily-reward/claim', user.token);
    expect(unlocked.body.code).not.toBe('IDENTITY_VERIFICATION_REQUIRED');
  });

  it('leaves browsing open without an identity document', async () => {
    const user = await api.registerUser({ withIdentity: false });

    await api.get('/users/me/campaigns/eligible', user.token).expect(200);
  });
});
