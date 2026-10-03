import { SystemRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
import { AdminDailySummaryService, AdminDashboardService } from '../services';

import { AdminDashboardController } from './admin-dashboard.controller';

describe('AdminDashboardController', () => {
  const service = { getSeries: jest.fn() };
  const summaryService = { getLatest: jest.fn().mockResolvedValue({ day: '2026-10-02', text: 'Summary' }) };
  const controller = new AdminDashboardController(
    service as unknown as AdminDashboardService,
    summaryService as unknown as AdminDailySummaryService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('is for admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminDashboardController)).toEqual([SystemRole.Admin]);
  });

  it('defaults to the last 30 days', async () => {
    await controller.getSeries({});
    await controller.getSeries({ days: 7 });

    expect(service.getSeries).toHaveBeenNthCalledWith(1, 30);
    expect(service.getSeries).toHaveBeenNthCalledWith(2, 7);
  });

  it('returns the latest daily summary', async () => {
    await expect(controller.getLatestSummary()).resolves.toEqual({ day: '2026-10-02', text: 'Summary' });
  });
});
