import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { AppConfigService } from '../src/modules/app-config/services';

import { Api, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Maintenance mode and the minimum app version are switches that turn people away, so what matters most here is
 * that they turn the right people away, leave the right doors open, and can always be switched off again.
 *
 * Every test file shares one database, so whatever these tests switch on is put back straight through the database
 * afterwards, even if a test fails half-way.
 */
describe('App config: maintenance mode and minimum app version (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let appConfig: AppConfigService;
  let adminToken: string;
  let user: TestUser;

  const setConfig = (body: Record<string, unknown>) => api.patch('/admin/platform-configuration', adminToken).send(body);

  /** Puts the settings back the way a normal platform has them, without going through anything that could be switched off. */
  const restore = async () => {
    await prisma.platformConfiguration.updateMany({ data: { maintenanceMode: false, maintenanceMessage: null, minimumAppVersion: '1.0.0', updateUrl: null } });
    appConfig.invalidate();
  };

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    appConfig = app.get(AppConfigService);
    adminToken = await api.adminToken();
    user = await api.registerUser();
    await restore();
  });

  afterEach(restore);

  afterAll(async () => {
    await restore();
    await app.close();
  });

  describe('GET /app-config', () => {
    it('is public and reports an open platform by default', async () => {
      const res = await api.get('/app-config').expect(200);

      expect(res.body.data).toMatchObject({ maintenanceMode: false, minimumAppVersion: '1.0.0', updateUrl: null, updateRequired: false });
      expect(typeof res.body.data.maintenanceMessage).toBe('string');
    });

    it('tells an app whether it has to update, from the version it sends', async () => {
      await setConfig({ minimumAppVersion: '2.0.0', updateUrl: 'https://play.google.com/store/apps/details?id=com.example' }).expect(200);

      const old = await api.get('/app-config').set('X-App-Version', '1.9.9').expect(200);
      const current = await api.get('/app-config').set('X-App-Version', '2.0.0').expect(200);
      const unknown = await api.get('/app-config').expect(200);

      expect(old.body.data).toMatchObject({ updateRequired: true, minimumAppVersion: '2.0.0', updateUrl: 'https://play.google.com/store/apps/details?id=com.example' });
      expect(current.body.data.updateRequired).toBe(false);
      expect(unknown.body.data.updateRequired).toBe(false);
    });
  });

  describe('minimum app version', () => {
    it('turns an older app away with 426 on any request, and says where to update', async () => {
      await setConfig({ minimumAppVersion: '2.0.0', updateUrl: 'https://play.google.com/store/apps/details?id=com.example' }).expect(200);

      const res = await api.get('/leaderboard', user.token).set('X-App-Version', '1.9.9').expect(426);

      expect(res.body).toMatchObject({ code: 'APP_UPDATE_REQUIRED', details: { minimumVersion: '2.0.0', updateUrl: 'https://play.google.com/store/apps/details?id=com.example' } });
    });

    it('lets an app that is up to date, and a caller that sends no version, carry on', async () => {
      await setConfig({ minimumAppVersion: '2.0.0' }).expect(200);

      await api.get('/leaderboard', user.token).set('X-App-Version', '2.0.0').expect(200);
      await api.get('/leaderboard', user.token).set('X-App-Version', '3.1.4+9').expect(200);
      await api.get('/leaderboard', user.token).expect(200);
    });

    it('does not turn an old app away from asking what the settings are, or from the health check', async () => {
      await setConfig({ minimumAppVersion: '2.0.0' }).expect(200);

      await api.get('/app-config').set('X-App-Version', '0.0.1').expect(200);
      await api.get('/health').set('X-App-Version', '0.0.1').expect(200);
    });

    it('takes effect at once when the admin saves, and lifts at once when they lower it again', async () => {
      await setConfig({ minimumAppVersion: '2.0.0' }).expect(200);
      await api.get('/leaderboard', user.token).set('X-App-Version', '1.5.0').expect(426);

      await setConfig({ minimumAppVersion: '1.5.0' }).expect(200);
      await api.get('/leaderboard', user.token).set('X-App-Version', '1.5.0').expect(200);
    });
  });

  describe('maintenance mode', () => {
    it('turns a signed-in user away with 503 and the admin’s message', async () => {
      await setConfig({ maintenanceMode: true, maintenanceMessage: 'Back at 6 PM tonight' }).expect(200);

      const res = await api.get('/leaderboard', user.token).expect(503);

      expect(res.body).toMatchObject({ code: 'MAINTENANCE_MODE', message: 'Back at 6 PM tonight' });
    });

    it('turns away someone who is not signed in from the public calls too, such as registering, and shows the message on the app-config call', async () => {
      await setConfig({ maintenanceMode: true, maintenanceMessage: 'Back at 6 PM tonight' }).expect(200);

      await api.post('/auth/register').send({ firstName: 'New', lastName: 'Person', email: `maintenance-${Date.now()}@example.com`, password: 'Passw0rd!23' }).expect(503);
      const settings = await api.get('/app-config').expect(200);
      expect(settings.body.data).toMatchObject({ maintenanceMode: true, maintenanceMessage: 'Back at 6 PM tonight' });
    });

    it('uses a default message when the admin has not written one', async () => {
      await setConfig({ maintenanceMode: true, maintenanceMessage: null }).expect(200);

      const res = await api.get('/leaderboard', user.token).expect(503);

      expect(res.body.message).toMatch(/back shortly/i);
    });

    it('keeps the health check, sign-in and the admin’s own work open, so it can be switched off', async () => {
      await setConfig({ maintenanceMode: true }).expect(200);

      await api.get('/health').expect(200);
      await api.post('/auth/login').send({ email: user.email, password: 'Passw0rd!23' }).expect(200);
      await api.get('/admin/platform-configuration', adminToken).expect(200);
    });

    it('does not hold back a payment callback: it is refused for its own reasons, never for maintenance', async () => {
      await setConfig({ maintenanceMode: true }).expect(200);

      const res = await api.post('/payments/webhooks/razorpay').send({});

      expect(res.status).not.toBe(503);
    });

    it('stays off-limits to a user who tries to switch it off, and lets the admin do it', async () => {
      await setConfig({ maintenanceMode: true }).expect(200);

      await api.patch('/admin/platform-configuration', user.token).send({ maintenanceMode: false }).expect(503);
      await api.get('/leaderboard', user.token).expect(503);

      await setConfig({ maintenanceMode: false }).expect(200);
      await api.get('/leaderboard', user.token).expect(200);
    });

    it('is refused for a user even when the platform is open: only an admin can change these settings', async () => {
      await api.patch('/admin/platform-configuration', user.token).send({ maintenanceMode: true }).expect(403);

      await api.get('/leaderboard', user.token).expect(200);
    });
  });

  describe('what the admin can save', () => {
    it.each([{ maintenanceMode: 'false' }, { maintenanceMode: 'yes' }, { maintenanceMode: null }])('refuses %j: "false" as text must not switch maintenance on', async (body) => {
      await setConfig(body).expect(422);

      await api.get('/leaderboard', user.token).expect(200);
    });

    it.each([{ minimumAppVersion: '2' }, { minimumAppVersion: 'latest' }, { updateUrl: 'http://example.com' }, { updateUrl: 'javascript:alert(1)' }])('refuses %j', async (body) => {
      await setConfig(body).expect(422);
    });

    it('records the change in the audit log, with what it was before', async () => {
      await setConfig({ minimumAppVersion: '1.2.0' }).expect(200);

      const entry = await prisma.auditLog.findFirst({ where: { entity: 'PlatformConfiguration', action: 'CONFIG_CHANGE' }, orderBy: { createdAt: 'desc' } });

      expect(entry?.after).toMatchObject({ minimumAppVersion: '1.2.0' });
      expect(entry?.before).toMatchObject({ minimumAppVersion: '1.0.0' });
    });
  });
});
