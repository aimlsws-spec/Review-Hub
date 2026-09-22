import { APP_CONFIG_CONSTANTS } from '../constants';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  const prisma = { platformConfiguration: { findFirst: jest.fn() } };
  let service: AppConfigService;

  const row = (overrides: Record<string, unknown> = {}) => ({ maintenanceMode: false, maintenanceMessage: null, minimumAppVersion: '1.0.0', updateUrl: null, ...overrides });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    prisma.platformConfiguration.findFirst.mockResolvedValue(row());
    service = new AppConfigService(prisma as never);
  });

  afterEach(() => jest.useRealTimers());

  it('reads the settings and fills in the defaults for what is empty', async () => {
    prisma.platformConfiguration.findFirst.mockResolvedValue(row({ maintenanceMessage: '   ' }));

    await expect(service.snapshot()).resolves.toEqual({
      maintenanceMode: false,
      maintenanceMessage: APP_CONFIG_CONSTANTS.DEFAULT_MAINTENANCE_MESSAGE,
      minimumAppVersion: '1.0.0',
      updateUrl: null,
    });
  });

  it('uses the admin’s own message and update link when they set them', async () => {
    prisma.platformConfiguration.findFirst.mockResolvedValue(row({ maintenanceMode: true, maintenanceMessage: 'Back at 6 PM', updateUrl: 'https://play.google.com/store/apps/details?id=x' }));

    await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: true, maintenanceMessage: 'Back at 6 PM', updateUrl: 'https://play.google.com/store/apps/details?id=x' });
  });

  it('remembers the settings for a few seconds instead of reading the database on every request', async () => {
    await service.snapshot();
    await service.snapshot();
    jest.advanceTimersByTime(APP_CONFIG_CONSTANTS.CACHE_TTL_MS - 1);
    await service.snapshot();

    expect(prisma.platformConfiguration.findFirst).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2);
    await service.snapshot();

    expect(prisma.platformConfiguration.findFirst).toHaveBeenCalledTimes(2);
  });

  it('lets requests that arrive together share one read', async () => {
    let finish: (value: unknown) => void = () => undefined;
    prisma.platformConfiguration.findFirst.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const all = Promise.all([service.snapshot(), service.snapshot(), service.snapshot()]);
    finish(row({ maintenanceMode: true }));
    const results = await all;

    expect(prisma.platformConfiguration.findFirst).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.maintenanceMode)).toBe(true);
  });

  it('reads again straight away after a change is saved', async () => {
    await service.snapshot();
    prisma.platformConfiguration.findFirst.mockResolvedValue(row({ maintenanceMode: true }));

    service.invalidate();

    await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: true });
  });

  it('does not let a read that began before a change put its older answer back', async () => {
    let finishOld: (value: unknown) => void = () => undefined;
    prisma.platformConfiguration.findFirst.mockReturnValueOnce(new Promise((resolve) => (finishOld = resolve)));
    const stale = service.snapshot();

    service.invalidate();
    finishOld(row({ maintenanceMode: false }));
    await stale;

    prisma.platformConfiguration.findFirst.mockResolvedValue(row({ maintenanceMode: true }));
    await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: true });
  });

  describe('when the settings can not be read', () => {
    it('keeps using the last known settings, so maintenance does not switch itself off', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValueOnce(row({ maintenanceMode: true }));
      await service.snapshot();
      jest.advanceTimersByTime(APP_CONFIG_CONSTANTS.CACHE_TTL_MS + 1);
      prisma.platformConfiguration.findFirst.mockRejectedValue(new Error('database down'));

      await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: true });
    });

    it('treats the platform as open when there is nothing to fall back on: a database problem must not lock everyone out', async () => {
      prisma.platformConfiguration.findFirst.mockRejectedValue(new Error('database down'));

      await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: false, minimumAppVersion: '1.0.0' });
    });

    it('tries again on the next request', async () => {
      prisma.platformConfiguration.findFirst.mockRejectedValueOnce(new Error('database down'));
      await service.snapshot();
      prisma.platformConfiguration.findFirst.mockResolvedValue(row({ maintenanceMode: true }));

      await expect(service.snapshot()).resolves.toMatchObject({ maintenanceMode: true });
    });
  });

  describe('publicView', () => {
    it('says an app older than the minimum has to update', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue(row({ minimumAppVersion: '1.4.0' }));

      await expect(service.publicView('1.3.9')).resolves.toMatchObject({ updateRequired: true, minimumAppVersion: '1.4.0' });
      await expect(service.publicView('1.4.0')).resolves.toMatchObject({ updateRequired: false });
      await expect(service.publicView('2.0.0')).resolves.toMatchObject({ updateRequired: false });
    });

    it('does not ask an app that did not say its version to update', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue(row({ minimumAppVersion: '9.0.0' }));

      await expect(service.publicView(undefined)).resolves.toMatchObject({ updateRequired: false });
    });
  });
});
