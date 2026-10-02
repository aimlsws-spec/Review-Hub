import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { OtpService } from '../src/modules/auth/services/otp.service';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Account-security flows end to end against the real database and Redis: policy acceptance at sign-up, the code a
 * sign-in from a new device needs, changing the phone number, and deleting an account. The codes are random and only
 * ever emailed or texted, so the generator is pinned around each step that issues one; everything else (storage,
 * hashing, expiry, Redis challenges) runs for real.
 */
describe('Account security (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let otp: OtpService;

  const PASSWORD = 'Passw0rd!23';
  const CODE = '135790';
  let counter = 0;
  const unique = () => `${Date.now()}${++counter}`;

  /** Runs `fn` with the OTP generator returning CODE, and clears the resend cooldown first so steps can follow quickly. */
  const withKnownCode = async <T>(fn: () => Promise<T>): Promise<T> => {
    const pinned = jest.spyOn(otp as unknown as { generateCode(): string }, 'generateCode').mockReturnValue(CODE);
    try {
      return await fn();
    } finally {
      pinned.mockRestore();
    }
  };

  /** Registers from a given device, so the account's first known device is that one. */
  const registerOn = async (deviceId: string) => {
    const id = unique();
    const email = `security-${id}@example.com`;
    const phone = `+9193${id.slice(-8).padStart(8, '0')}`;
    const res = await api
      .post('/auth/register')
      .set('X-Device-ID', deviceId)
      .send({ firstName: 'Sec', lastName: 'Person', email, phone, password: PASSWORD, acceptPolicies: true })
      .expect(201);
    return { id: res.body.data.user.id as string, email, phone, token: res.body.data.tokens.accessToken as string };
  };

  const loginOn = (deviceId: string, email: string) =>
    api.post('/auth/login').set('X-Device-ID', deviceId).send({ email, password: PASSWORD }).expect(200);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    otp = app.get(OtpService, { strict: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('policy acceptance', () => {
    it('refuses to create an account without accepting the policies', async () => {
      const id = unique();
      await api
        .post('/auth/register')
        .send({ firstName: 'No', lastName: 'Consent', email: `consent-${id}@example.com`, password: PASSWORD })
        .expect(422);

      expect(await prisma.user.count({ where: { email: `consent-${id}@example.com` } })).toBe(0);
    });

    it('records the current version of every policy at sign-up, so nothing is pending', async () => {
      const user = await registerOn(`device-${unique()}`);

      const me = (await api.get('/auth/me', user.token).expect(200)).body.data;
      expect(me.pendingPolicies).toEqual([]);

      const policies = (await api.get('/auth/policies', user.token).expect(200)).body.data;
      expect(policies).toHaveLength(3);
      expect(policies.every((p: { acceptedAt: string | null }) => p.acceptedAt !== null)).toBe(true);
    });

    it('asks again for a version not yet accepted, and accepting clears it', async () => {
      const user = await registerOn(`device-${unique()}`);
      // As if the Reward Policy had been bumped after this person signed up.
      await prisma.policyAcceptance.deleteMany({ where: { userId: user.id, policy: 'REWARD_POLICY' } });

      expect((await api.get('/auth/me', user.token).expect(200)).body.data.pendingPolicies).toEqual(['REWARD_POLICY']);

      await api.post('/auth/policies/accept', user.token).expect(200);
      expect((await api.get('/auth/me', user.token).expect(200)).body.data.pendingPolicies).toEqual([]);
    });
  });

  describe('sign-in from a new device', () => {
    it('signs in straight away on the device the account was created on', async () => {
      const device = `device-${unique()}`;
      const user = await registerOn(device);

      const res = await loginOn(device, user.email);

      expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    });

    it('asks for a code on another device, and only that device can finish the sign-in', async () => {
      const user = await registerOn(`device-${unique()}`);
      const newDevice = `device-${unique()}`;

      const challenge = (await withKnownCode(() => loginOn(newDevice, user.email))).body.data;
      expect(challenge).toMatchObject({ requiresVerification: true, challengeToken: expect.stringMatching(/^[a-f0-9]{64}$/) });
      expect(challenge.tokens).toBeUndefined();

      // The same token and code from a third device get nothing.
      await api
        .post('/auth/login/verify-device')
        .set('X-Device-ID', `device-${unique()}`)
        .send({ challengeToken: challenge.challengeToken, code: CODE })
        .expect(401);

      const done = await api
        .post('/auth/login/verify-device')
        .set('X-Device-ID', newDevice)
        .send({ challengeToken: challenge.challengeToken, code: CODE })
        .expect(200);
      expect(done.body.data.tokens.accessToken).toEqual(expect.any(String));

      // The token is single-use, and the device is now recognised.
      await api
        .post('/auth/login/verify-device')
        .set('X-Device-ID', newDevice)
        .send({ challengeToken: challenge.challengeToken, code: CODE })
        .expect(401);
      const again = await loginOn(newDevice, user.email);
      expect(again.body.data.tokens.accessToken).toEqual(expect.any(String));
    });

    it('opens no session for a wrong code', async () => {
      const user = await registerOn(`device-${unique()}`);
      const newDevice = `device-${unique()}`;
      const challenge = (await withKnownCode(() => loginOn(newDevice, user.email))).body.data;

      await api
        .post('/auth/login/verify-device')
        .set('X-Device-ID', newDevice)
        .send({ challengeToken: challenge.challengeToken, code: '000000' })
        .expect(400);
    });

    it('will not issue a new-device or phone-change code through the general OTP endpoints', async () => {
      const user = await registerOn(`device-${unique()}`);

      await api.post('/auth/send-otp', user.token).send({ type: 'NEW_DEVICE_LOGIN' }).expect(422);
      await api.post('/auth/send-otp', user.token).send({ type: 'PHONE_CHANGE' }).expect(422);
    });
  });

  describe('changing the phone number', () => {
    it('changes it only after the code sent to the new number', async () => {
      const user = await registerOn(`device-${unique()}`);
      const newPhone = `+9192${unique().slice(-8)}`;

      await withKnownCode(() =>
        api.post('/auth/phone/change', user.token).send({ newPhone, currentPassword: PASSWORD }).expect(200),
      );
      expect((await api.get('/auth/me', user.token).expect(200)).body.data.phone).toBe(user.phone);

      await api.post('/auth/phone/verify', user.token).send({ code: CODE }).expect(200);

      const me = (await api.get('/auth/me', user.token).expect(200)).body.data;
      expect(me.phone).toBe(newPhone);
      expect(me.phoneVerifiedAt).not.toBeNull();
    });

    it('refuses a number another account already has', async () => {
      const first = await registerOn(`device-${unique()}`);
      const second = await registerOn(`device-${unique()}`);

      await api.post('/auth/phone/change', second.token).send({ newPhone: first.phone, currentPassword: PASSWORD }).expect(409);
    });

    it('refuses without the current password', async () => {
      const user = await registerOn(`device-${unique()}`);

      await api.post('/auth/phone/change', user.token).send({ newPhone: `+9192${unique().slice(-8)}` }).expect(400);
    });
  });

  describe('deleting the account', () => {
    const deleteAccount = (token: string, currentPassword?: string) =>
      api.http().delete('/api/v1/auth/account').set('Authorization', `Bearer ${token}`).send(currentPassword ? { currentPassword } : {});

    it('deletes the account, signs it out, and frees the email and phone for a new sign-up', async () => {
      const user = await registerOn(`device-${unique()}`);

      await deleteAccount(user.token, 'wrong-password').expect(400);
      await deleteAccount(user.token, PASSWORD).expect(200);

      await api.get('/auth/me', user.token).expect(401);
      await api.post('/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);

      const again = await api
        .post('/auth/register')
        .send({ firstName: 'Sec', lastName: 'Again', email: user.email, phone: user.phone, password: PASSWORD, acceptPolicies: true })
        .expect(201);
      expect(again.body.data.user.id).not.toBe(user.id);

      // The old account row stays for its history, soft-deleted and without the identifiers.
      const old = await prisma.user.findUnique({ where: { id: user.id } });
      expect(old).toMatchObject({ email: null, phone: null, status: 'DEACTIVATED' });
      expect(old?.deletedAt).not.toBeNull();
    });

    it('refuses while the wallet still has money in it', async () => {
      const user = await registerOn(`device-${unique()}`);
      await api.post('/wallet/simulate-add-funds', user.token).send({ amount: 500 }).expect(200);

      const res = await deleteAccount(user.token, PASSWORD).expect(400);

      expect(res.body.message).toEqual(expect.stringContaining('withdraw'));
      await api.get('/auth/me', user.token).expect(200);
    });
  });
});
