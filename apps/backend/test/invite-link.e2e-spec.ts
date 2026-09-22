import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { AppConfigService } from '../src/modules/app-config/services';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * What a shared referral link does when someone taps it: sends them to the store page, with the code attached. The store
 * link is a platform setting shared with every other test, so it is put back through the database afterwards.
 */
describe('Invite link (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let appConfig: AppConfigService;

  const setStoreLink = async (updateUrl: string | null) => {
    await prisma.platformConfiguration.updateMany({ data: { updateUrl } });
    appConfig.invalidate();
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    appConfig = app.get(AppConfigService);
  });

  afterEach(() => setStoreLink(null));

  afterAll(async () => {
    await setStoreLink(null);
    await app.close();
  });

  it('is public: someone with no account and no app can open it', async () => {
    await setStoreLink('https://play.google.com/store/apps/details?id=com.seawindsolution.viralkar');

    await api.get('/invite/ASHA-123').expect(302);
  });

  it('sends them to the Play Store page with the referral code attached', async () => {
    await setStoreLink('https://play.google.com/store/apps/details?id=com.seawindsolution.viralkar');

    const res = await api.get('/invite/3f1c2e8a-1b2c-4d5e-8f90-a1b2c3d4e5f6').expect(302);

    const destination = new URL(res.headers.location);
    expect(destination.origin + destination.pathname).toBe('https://play.google.com/store/apps/details');
    expect(destination.searchParams.get('id')).toBe('com.seawindsolution.viralkar');
    expect(destination.searchParams.get('referrer')).toBe('code=3f1c2e8a-1b2c-4d5e-8f90-a1b2c3d4e5f6');
  });

  it('leaves another address as it is', async () => {
    await setStoreLink('https://example.com/get-the-app');

    const res = await api.get('/invite/ABC123').expect(302);

    expect(res.headers.location).toBe('https://example.com/get-the-app');
  });

  it('follows the store link an admin saves through the settings page, straight away', async () => {
    const admin = await api.adminToken();
    await api.patch('/admin/platform-configuration', admin).send({ updateUrl: 'https://play.google.com/store/apps/details?id=admin.set' }).expect(200);

    const res = await api.get('/invite/ABC123').expect(302);

    expect(res.headers.location).toContain('id=admin.set');
  });

  it('says not found when no store link has been set, instead of sending people nowhere', async () => {
    await setStoreLink(null);

    await api.get('/invite/ABC123').expect(404);
  });

  it.each(['abc', 'has%20space', 'a%2Fb', 'ABC%0D%0ASet-Cookie%3A%20x', 'x'.repeat(65)])('refuses the code %s', async (code) => {
    await setStoreLink('https://play.google.com/store/apps/details?id=x');

    const res = await api.get(`/invite/${code}`);

    expect([400, 404]).toContain(res.status);
    expect(res.headers.location).toBeUndefined();
  });

  it('does not tell a real code from one that was never issued', async () => {
    await setStoreLink('https://play.google.com/store/apps/details?id=x');
    const user = await api.registerUser();
    const me = await api.get('/auth/me', user.token).expect(200);

    const real = await api.get(`/invite/${me.body.data.referralCode}`).expect(302);
    const made = await api.get('/invite/NEVER-ISSUED-CODE').expect(302);

    expect(new URL(real.headers.location).origin).toBe(new URL(made.headers.location).origin);
  });
});
