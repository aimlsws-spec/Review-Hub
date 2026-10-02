import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Bank account numbers and UPI IDs are encrypted in the database and masked in every response, except where an
 * admin has to see them. These check the real database, not a mock: what is actually stored, and what goes out.
 */
describe('Bank details encryption (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let user: TestUser;

  const accountNumber = `9${String(Date.now()).slice(-11)}`;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    user = await api.registerUser();
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the number and UPI ID encrypted, and answers with the number masked', async () => {
    const res = await api
      .post('/wallet/bank-accounts', user.token)
      .send({ bankName: 'Test Bank', accountHolderName: 'E2E Person', accountNumber, ifscCode: 'TEST0001234', upiId: 'e2e.person@okhdfc' })
      .expect(201);

    expect(res.body.data.accountNumber).toBe(`XXXX${accountNumber.slice(-4)}`);
    expect(res.body.data.upiId).toBe('e2e.person@okhdfc');
    expect(res.body.data).not.toHaveProperty('accountNumberHash');

    const stored = await prisma.userBankAccount.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.accountNumber).toMatch(/^enc:v1:/);
    expect(stored.accountNumber).not.toContain(accountNumber);
    expect(stored.upiId).toMatch(/^enc:v1:/);
    expect(stored.accountNumberLast4).toBe(accountNumber.slice(-4));
    expect(stored.accountNumberHash).toMatch(/^[0-9a-f]{64}$/);

    const list = await api.get('/wallet/bank-accounts', user.token).expect(200);
    expect(JSON.stringify(list.body.data)).not.toContain(accountNumber);
  });

  it('still refuses the same account twice for one person, although the numbers are encrypted differently', async () => {
    await api
      .post('/wallet/bank-accounts', user.token)
      .send({ bankName: 'Test Bank', accountHolderName: 'E2E Person', accountNumber, ifscCode: 'TEST0001234' })
      .expect(409);
  });

  it('refuses an account number that is not 9 to 18 digits, and a malformed UPI ID', async () => {
    await api
      .post('/wallet/bank-accounts', user.token)
      .send({ bankName: 'Test Bank', accountHolderName: 'E2E Person', accountNumber: '12AB34567', ifscCode: 'TEST0001234' })
      .expect(422);
    await api
      .post('/wallet/bank-accounts', user.token)
      .send({ bankName: 'Test Bank', accountHolderName: 'E2E Person', accountNumber: '123456789', ifscCode: 'TEST0001234', upiId: 'not a upi' })
      .expect(422);
  });
});
