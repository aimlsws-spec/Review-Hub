import { DashboardMetricsRepository } from '../repositories/dashboard-metrics.repository';

import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  const metrics = {
    commissionByDay: jest.fn(),
    newUsersByDay: jest.fn(),
    campaignsCreatedByDay: jest.fn(),
    withdrawalsRequestedByDay: jest.fn(),
    withdrawalsPaidByDay: jest.fn(),
    fraudFlagsByDay: jest.fn(),
    countActiveCampaigns: jest.fn(),
  };
  const service = new AdminDashboardService(metrics as unknown as DashboardMetricsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    for (const fn of Object.values(metrics)) fn.mockResolvedValue([]);
    metrics.countActiveCampaigns.mockResolvedValue(4);
  });

  it('covers the last N India days ending today, with empty days as zeros', async () => {
    metrics.newUsersByDay.mockResolvedValue([{ day: '2026-10-02', value: 5 }]);
    metrics.commissionByDay.mockResolvedValue([
      { day: '2026-10-01', value: 120.5 },
      { day: '2026-10-03', value: 30 },
    ]);

    const result = await service.getSeries(7, new Date('2026-10-03T10:00:00Z'));

    expect(metrics.newUsersByDay).toHaveBeenCalledWith(new Date('2026-09-26T18:30:00.000Z'), new Date('2026-10-03T18:30:00.000Z'));
    expect(result.days.map((d) => d.day)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(result.days[5]).toEqual({
      day: '2026-10-02',
      commission: 0,
      newUsers: 5,
      campaignsCreated: 0,
      withdrawalsRequested: 0,
      withdrawalsPaid: 0,
      fraudFlags: 0,
    });
    expect(result.totals.commission).toBe(150.5);
    expect(result.totals.newUsers).toBe(5);
    expect(result.activeCampaigns).toBe(4);
  });
});
