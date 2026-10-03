import { NotificationQueueService } from '../../notification/services';
import { AdminDailySummaryRepository } from '../repositories/admin-daily-summary.repository';

import { AdminDailySummaryService, summaryText } from './admin-daily-summary.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDailySummaryService', () => {
  const repository = {
    activityBetween: jest.fn(),
    topCampaignsBetween: jest.fn(),
    findRecipientIds: jest.fn(),
    findByDay: jest.fn(),
    create: jest.fn(),
    findLatest: jest.fn(),
  };
  const dashboard = { seriesBetween: jest.fn() };
  const notificationQueue = { enqueue: jest.fn() };
  const service = new AdminDailySummaryService(
    repository as unknown as AdminDailySummaryRepository,
    dashboard as unknown as AdminDashboardService,
    notificationQueue as unknown as NotificationQueueService,
  );
  // 08:00 IST on 3 Oct, when the job runs: the summary is for 2 Oct.
  const now = new Date('2026-10-03T02:30:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByDay.mockResolvedValue(null);
    dashboard.seriesBetween.mockResolvedValue({
      totals: { commission: 1500, newUsers: 40, campaignsCreated: 3, withdrawalsRequested: 9000, withdrawalsPaid: 4000, fraudFlags: 1 },
      activeCampaigns: 12,
    });
    repository.activityBetween.mockResolvedValue({ tasksApproved: 210, rewardsCredited: 200, rewardsAmount: 10500.5 });
    repository.topCampaignsBetween.mockResolvedValue([{ title: 'Diwali offer', completions: 80 }]);
    repository.findRecipientIds.mockResolvedValue(['admin-1', 'admin-2']);
  });

  it('summarises yesterday (India time), stores it and sends it to every admin', async () => {
    const result = await service.buildForYesterday(now);

    expect(dashboard.seriesBetween).toHaveBeenCalledWith(new Date('2026-10-01T18:30:00Z'), new Date('2026-10-02T18:30:00Z'));
    expect(repository.create).toHaveBeenCalledWith('2026-10-02', expect.stringContaining('Busiest campaigns: Diwali offer (80).'), expect.objectContaining({ newUsers: 40, tasksApproved: 210 }));
    expect(notificationQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(notificationQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: 'admin-1', title: 'Platform summary for 2026-10-02', channels: ['IN_APP', 'EMAIL'] }));
    expect(result).toEqual({ day: '2026-10-02', created: true, recipients: 2 });
  });

  it('does nothing the second time for the same day', async () => {
    repository.findByDay.mockResolvedValue({ id: 'sum-1' });

    await expect(service.buildForYesterday(now)).resolves.toEqual({ day: '2026-10-02', created: false, recipients: 0 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(notificationQueue.enqueue).not.toHaveBeenCalled();
  });

  it('writes plain sentences from the figures alone', () => {
    const text = summaryText('2026-10-02', {
      newUsers: 1,
      campaignsCreated: 0,
      activeCampaigns: 2,
      tasksApproved: 5,
      rewardsCredited: 5,
      rewardsAmount: 250,
      commission: 25,
      withdrawalsRequested: 0,
      withdrawalsPaid: 0,
      fraudFlags: 1,
      topCampaigns: [],
    });

    expect(text).toContain('People: 1 signed up.');
    expect(text).toContain('Fraud: 1 flag raised.');
    expect(text).not.toContain('Busiest');
  });

  it('returns the latest summary', async () => {
    repository.findLatest.mockResolvedValue({ day: '2026-10-02' });

    await expect(service.getLatest()).resolves.toEqual({ day: '2026-10-02' });
  });
});
