import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { createTestApp } from './utils/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Unique per run so repeated local runs against a persistent dev DB don't collide on email/phone.
  const unique = Date.now();
  const email = `e2e-${unique}@example.com`;
  const phone = `+9198${String(unique).slice(-8)}`;
  const password = 'Passw0rd!23';
  let createdUserId: string | undefined;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // This suite runs against a real dev database, not a throwaway one — leave it as it found it.
    if (createdUserId) {
      await prisma.activityLog.deleteMany({ where: { userId: createdUserId } });
      await prisma.loginHistory.deleteMany({ where: { userId: createdUserId } });
      await prisma.userSession.deleteMany({ where: { userId: createdUserId } });
      await prisma.device.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await app.close();
  });

  it('registers a new user and returns access + refresh tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'E2E', lastName: 'Test', email, phone, password })
      .expect(201);

    expect(res.body.data.user).toMatchObject({ email, phone });
    expect(res.body.data.tokens).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    createdUserId = res.body.data.user.id;
  });

  it('rejects registering the same email twice', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'E2E', lastName: 'Test', email, phone: `+9197${String(unique).slice(-8)}`, password })
      .expect(409);
  });

  it('logs in with the registered credentials and returns a fresh token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!1' })
      .expect(401);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns the current profile for an authenticated request', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = login.body.data.tokens.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toMatchObject({ email, phone });
  });
});
