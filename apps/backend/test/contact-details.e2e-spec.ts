import { INestApplication } from '@nestjs/common';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Email is the account's contact for codes (SMS is not part of the product), so sign-up needs it; the phone number
 * is optional contact information, edited from the profile without any code.
 */
describe('Contact details (e2e)', () => {
  let app: INestApplication;
  let api: Api;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const signUp = (body: Record<string, unknown>) =>
    api.post('/auth/register').send({ firstName: 'Contact', lastName: 'Test', password: 'Passw0rd!123', acceptPolicies: true, ...body });

  it('refuses a sign-up without an email address', async () => {
    const res = await signUp({ phone: `+9196${String(Date.now()).slice(-8)}` }).expect(422);
    expect(res.body.details.email).toBeDefined();
  });

  it('accepts a sign-up with an email and no phone', async () => {
    await signUp({ email: `contact-${Date.now()}@example.com` }).expect(201);
  });

  it('saves, changes and removes the phone number from the profile without a code', async () => {
    const user = await api.registerUser();
    const phone = `+9195${String(Date.now()).slice(-8)}`;

    const saved = await api.patch('/auth/profile', user.token).send({ phone }).expect(200);
    expect(saved.body.data.phone).toBe(phone);
    expect(saved.body.data.phoneVerifiedAt).toBeNull();

    const removed = await api.patch('/auth/profile', user.token).send({ phone: '' }).expect(200);
    expect(removed.body.data.phone).toBeNull();
  });

  it("refuses another account's phone number", async () => {
    const owner = await api.registerUser();
    const other = await api.registerUser();

    await api.patch('/auth/profile', other.token).send({ phone: owner.phone }).expect(409);
  });

  it('refuses a malformed phone number', async () => {
    const user = await api.registerUser();

    await api.patch('/auth/profile', user.token).send({ phone: '12345' }).expect(422);
  });
});
