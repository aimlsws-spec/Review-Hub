import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { OtpService } from '../../src/modules/auth/services/otp.service';

/** The seeded platform administrator (prisma/seed.ts). Only ever exists in the throwaway test database. */
const ADMIN = { email: 'admin@viralkar.com', password: 'Admin@123456' };
const PASSWORD = 'Passw0rd!23';
/** The one-time code verifyEmail makes the OTP service issue, so a test can type it back in. */
const KNOWN_OTP = '246810';

/** 1x1 transparent PNG: a real image, so file validation passes without shipping a fixture file. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let counter = 0;

/** A value that is different on every call, so runs never collide on email, phone or PAN. */
function unique(): string {
  counter += 1;
  return `${Date.now()}${counter}`;
}

export interface TestUser {
  id: string;
  email: string;
  phone: string;
  token: string;
}

export interface TestMerchant extends TestUser {
  merchantId: string;
}

/**
 * Small helpers that drive the real HTTP API the way a client does, so every flow test reads as the steps a person
 * would take. Nothing here reaches into the database or the services directly.
 */
export class Api {
  constructor(readonly app: INestApplication) {}

  http() {
    return request(this.app.getHttpServer());
  }

  get(path: string, token?: string) {
    const req = this.http().get(`/api/v1${path}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  post(path: string, token?: string) {
    const req = this.http().post(`/api/v1${path}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  patch(path: string, token?: string) {
    const req = this.http().patch(`/api/v1${path}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  /**
   * Registers an ordinary app user and signs them in. By default they also upload an identity document, as every real
   * user must before the earning features open; pass `withIdentity: false` to test the locked state.
   */
  async registerUser({ withIdentity = true }: { withIdentity?: boolean } = {}): Promise<TestUser> {
    const id = unique();
    const email = `e2e-${id}@example.com`;
    const phone = `+9198${id.slice(-8).padStart(8, '0')}`;

    const res = await this.post('/auth/register')
      .send({ firstName: 'E2E', lastName: 'Person', email, phone, password: PASSWORD, acceptPolicies: true })
      .expect(201);

    const user = { id: res.body.data.user.id, email, phone, token: res.body.data.tokens.accessToken };
    if (withIdentity) await this.uploadIdentityDocument(user);
    return user;
  }

  /** Uploads an Aadhaar for the user, which unlocks the earning features while it waits for review. */
  async uploadIdentityDocument(user: TestUser) {
    await this.post('/kyc/documents', user.token)
      .field('documentType', 'AADHAAR')
      .field('documentNumber', `1234${String(Date.now()).slice(-8)}`)
      .attach('file', PNG, { filename: 'aadhaar.png', contentType: 'image/png' })
      .expect(201);
  }

  async login(email: string, password: string = PASSWORD): Promise<string> {
    const res = await this.post('/auth/login').send({ email, password }).expect(200);
    return res.body.data.tokens.accessToken;
  }

  /** The seeded administrator's access token. */
  async adminToken(): Promise<string> {
    return this.login(ADMIN.email, ADMIN.password);
  }

  /** A new merchant account: registered, approved by the admin, and signed in again so its token carries the merchant role. */
  async registerApprovedMerchant(adminToken: string): Promise<TestMerchant> {
    const owner = await this.registerUser();
    const id = unique();

    const created = await this.post('/merchants/register', owner.token)
      .send({ businessName: `E2E Cafe ${id}`, email: `merchant-${id}@example.com`, phone: `+9197${id.slice(-8).padStart(8, '0')}` })
      .expect(201);
    const merchantId: string = created.body.data.id;

    await this.post('/admin/merchants/approve', adminToken).send({ merchantId }).expect(200);

    // The role is added on approval, so sign in again to get a token that has it.
    const token = await this.login(owner.email);
    return { ...owner, token, merchantId };
  }

  /** Adds money to a merchant wallet through the mock gateway. */
  async rechargeMerchant(merchant: TestMerchant, amount: number) {
    return this.post(`/merchants/${merchant.merchantId}/wallet/recharge/simulate`, merchant.token).send({ amount }).expect(200);
  }

  /**
   * Verifies a user's email address through the real send-otp / verify-otp endpoints, which withdrawals require.
   * The one exception to "nothing reaches into the services": the code is random and only ever emailed, so the
   * generator is pinned for the length of this call. Everything else (storage, hashing, expiry, marking the email
   * verified) runs for real.
   */
  async verifyEmail(user: TestUser) {
    const otp = this.app.get(OtpService, { strict: false });
    const pinned = jest.spyOn(otp as unknown as { generateCode(): string }, 'generateCode').mockReturnValue(KNOWN_OTP);
    try {
      await this.post('/auth/send-otp', user.token).send({ type: 'EMAIL_VERIFICATION' }).expect(200);
      await this.post('/auth/verify-otp', user.token).send({ type: 'EMAIL_VERIFICATION', code: KNOWN_OTP }).expect(200);
    } finally {
      pinned.mockRestore();
    }
  }

  /** Gets a user's PAN approved by an admin, which withdrawals require. */
  async approvePan(user: TestUser, adminToken: string) {
    const uploaded = await this.post('/kyc/documents', user.token)
      .field('documentType', 'PAN')
      .field('documentNumber', `ABCDE${String(Date.now()).slice(-4)}F`)
      .attach('file', PNG, { filename: 'pan.png', contentType: 'image/png' })
      .expect(201);
    await this.post(`/admin/kyc/${uploaded.body.data.id}/approve`, adminToken).expect(200);
  }

  /** Adds a bank account for a user and returns its id. */
  async addBankAccount(user: TestUser): Promise<string> {
    const res = await this.post('/wallet/bank-accounts', user.token)
      .send({ bankName: 'Test Bank', accountHolderName: 'E2E Person', accountNumber: `${unique()}`.slice(-12), ifscCode: 'TEST0001234' })
      .expect(201);
    return res.body.data.id;
  }

  /** Puts money in a user's wallet through the mock gateway. */
  async fundWallet(user: TestUser, amount: number) {
    await this.post('/wallet/simulate-add-funds', user.token).send({ amount }).expect(200);
  }
}
