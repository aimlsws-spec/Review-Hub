import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/** The seeded platform administrator (prisma/seed.ts). Only ever exists in the throwaway test database. */
const ADMIN = { email: 'admin@reviewhub.com', password: 'Admin@123456' };
const PASSWORD = 'Passw0rd!23';

/** 1x1 transparent PNG: a real image, so file validation passes without shipping a fixture file. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

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

  /** Registers an ordinary app user and signs them in. */
  async registerUser(): Promise<TestUser> {
    const id = unique();
    const email = `e2e-${id}@example.com`;
    const phone = `+9198${id.slice(-8).padStart(8, '0')}`;

    const res = await this.post('/auth/register')
      .send({ firstName: 'E2E', lastName: 'Person', email, phone, password: PASSWORD })
      .expect(201);

    return { id: res.body.data.user.id, email, phone, token: res.body.data.tokens.accessToken };
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
