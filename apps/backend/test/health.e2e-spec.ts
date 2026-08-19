import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp } from './utils/create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns a report covering database, cache, and storage', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body.data).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded|down)$/),
      services: {
        database: { status: expect.stringMatching(/^(up|down)$/) },
        cache: { status: expect.stringMatching(/^(up|down)$/) },
        storage: { status: expect.stringMatching(/^(up|down)$/) },
      },
    });
  });

  it('GET /api/v1/health/storage reports the local uploads directory as reachable', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/storage').expect(200);

    expect(res.body.data.status).toBe('up');
  });
});
