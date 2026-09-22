import { ExecutionContext } from '@nestjs/common';

import { AppUpdateRequiredException, MaintenanceException } from '../exceptions';

import { MaintenanceGuard } from './maintenance.guard';

describe('MaintenanceGuard', () => {
  const appConfig = { snapshot: jest.fn() };
  let guard: MaintenanceGuard;

  const config = (overrides: Record<string, unknown> = {}) => ({ maintenanceMode: false, maintenanceMessage: 'Back soon', minimumAppVersion: '1.0.0', updateUrl: 'https://store.example/app', ...overrides });
  const requestTo = (path: string, options: { roles?: string[]; version?: string } = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path, headers: options.version ? { 'x-app-version': options.version } : {}, user: options.roles ? { roles: options.roles } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    appConfig.snapshot.mockResolvedValue(config());
    guard = new MaintenanceGuard(appConfig as never);
  });

  describe('when the platform is open', () => {
    it('lets everyone through, with or without a version', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/wallet', { roles: ['USER'] }))).resolves.toBe(true);
      await expect(guard.canActivate(requestTo('/api/v1/tasks', { version: '1.0.0' }))).resolves.toBe(true);
    });
  });

  describe('during maintenance', () => {
    beforeEach(() => appConfig.snapshot.mockResolvedValue(config({ maintenanceMode: true })));

    it('turns a signed-in user away with the admin’s message', async () => {
      const attempt = guard.canActivate(requestTo('/api/v1/wallet', { roles: ['USER'] }));

      await expect(attempt).rejects.toBeInstanceOf(MaintenanceException);
      await expect(attempt).rejects.toMatchObject({ message: 'Back soon', code: 'MAINTENANCE_MODE', status: 503 });
    });

    it('turns away a merchant, and someone who is not signed in', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/merchants/x/campaigns', { roles: ['MERCHANT'] }))).rejects.toBeInstanceOf(MaintenanceException);
      await expect(guard.canActivate(requestTo('/api/v1/tasks'))).rejects.toBeInstanceOf(MaintenanceException);
    });

    it('lets an administrator through, so they can switch it off', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/admin/platform-configuration', { roles: ['ADMIN'] }))).resolves.toBe(true);
    });

    it('does not let a user through by naming a role it does not have', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/admin/users', { roles: ['admin'] }))).rejects.toBeInstanceOf(MaintenanceException);
    });

    it.each([
      '/api/v1/health',
      '/api/v1/health/ready',
      '/api/v1/app-config',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/payments/webhooks/razorpay',
      '/api/v1/internal/ai/verification-jobs/next',
    ])('keeps %s open: monitoring, sign-in and server-to-server calls must still work', async (path) => {
      await expect(guard.canActivate(requestTo(path))).resolves.toBe(true);
    });

    it.each(['/api/v1/auth/register', '/api/v1/auth/send-otp', '/api/v1/auth/login-history', '/api/v1/healthcheck', '/api/v1/wallet/payments/webhooks', '/api/v1/app-configuration'])('does not leave %s open', async (path) => {
      await expect(guard.canActivate(requestTo(path))).rejects.toBeInstanceOf(MaintenanceException);
    });
  });

  describe('old app versions', () => {
    beforeEach(() => appConfig.snapshot.mockResolvedValue(config({ minimumAppVersion: '1.4.0' })));

    it('turns an older app away with 426 and tells it where to update', async () => {
      const attempt = guard.canActivate(requestTo('/api/v1/tasks', { roles: ['USER'], version: '1.3.9' }));

      await expect(attempt).rejects.toBeInstanceOf(AppUpdateRequiredException);
      await expect(attempt).rejects.toMatchObject({ code: 'APP_UPDATE_REQUIRED', status: 426 });
      await expect(attempt).rejects.toMatchObject({ response: { details: { minimumVersion: '1.4.0', updateUrl: 'https://store.example/app' } } });
    });

    it('lets an app that is up to date or newer through', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/tasks', { version: '1.4.0' }))).resolves.toBe(true);
      await expect(guard.canActivate(requestTo('/api/v1/tasks', { version: '2.0.0+3' }))).resolves.toBe(true);
    });

    it('never refuses a caller that sends no version (the web portals, tools, older app builds)', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/tasks', { roles: ['ADMIN'] }))).resolves.toBe(true);
    });

    it('does not refuse on a version it can not read', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/tasks', { version: 'garbage' }))).resolves.toBe(true);
    });

    it('still lets an old app ask what the settings are, so it can be told to update', async () => {
      await expect(guard.canActivate(requestTo('/api/v1/app-config', { version: '0.1.0' }))).resolves.toBe(true);
      await expect(guard.canActivate(requestTo('/api/v1/health', { version: '0.1.0' }))).resolves.toBe(true);
    });
  });

  it('says maintenance first when both apply', async () => {
    appConfig.snapshot.mockResolvedValue(config({ maintenanceMode: true, minimumAppVersion: '9.0.0' }));

    await expect(guard.canActivate(requestTo('/api/v1/tasks', { version: '1.0.0' }))).rejects.toBeInstanceOf(MaintenanceException);
  });
});
