import { CampaignPerformanceService } from './campaign-performance.service';

describe('CampaignPerformanceService', () => {
  const prisma = { campaignParticipant: { groupBy: jest.fn() }, reward: { groupBy: jest.fn() } };
  let service: CampaignPerformanceService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.campaignParticipant.groupBy.mockResolvedValue([]);
    prisma.reward.groupBy.mockResolvedValue([]);
    service = new CampaignPerformanceService(prisma as never);
  });

  it('gives an entry of zeros for a campaign nobody has joined', async () => {
    const result = await service.forCampaigns(['c-1']);

    expect(result.get('c-1')).toEqual({ campaignId: 'c-1', joins: 0, finished: 0, completionRate: 0, completions: 0, rewardsPaid: 0 });
  });

  it('does not query when there are no campaigns', async () => {
    const result = await service.forCampaigns([]);

    expect(result.size).toBe(0);
    expect(prisma.campaignParticipant.groupBy).not.toHaveBeenCalled();
  });

  it('counts joins, finishers, completed tasks and what was paid, per campaign', async () => {
    prisma.campaignParticipant.groupBy
      .mockResolvedValueOnce([
        { campaignId: 'c-1', _count: { _all: 40 } },
        { campaignId: 'c-2', _count: { _all: 10 } },
      ])
      .mockResolvedValueOnce([{ campaignId: 'c-1', _count: { _all: 10 } }]);
    prisma.reward.groupBy.mockResolvedValue([{ campaignId: 'c-1', _count: { _all: 10 }, _sum: { amount: '500.50' } }]);

    const result = await service.forCampaigns(['c-1', 'c-2']);

    expect(result.get('c-1')).toEqual({ campaignId: 'c-1', joins: 40, finished: 10, completionRate: 0.25, completions: 10, rewardsPaid: 500.5 });
    expect(result.get('c-2')).toMatchObject({ joins: 10, finished: 0, completionRate: 0, completions: 0, rewardsPaid: 0 });
  });

  it('never reports a completion rate above 100%', async () => {
    prisma.campaignParticipant.groupBy
      .mockResolvedValueOnce([{ campaignId: 'c-1', _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ campaignId: 'c-1', _count: { _all: 3 } }]);

    const result = await service.forCampaigns(['c-1']);

    expect(result.get('c-1')?.completionRate).toBe(1);
  });

  it('leaves out people disqualified for fraud from the joins, and reversed rewards from what was paid', async () => {
    await service.forCampaigns(['c-1']);

    expect(prisma.campaignParticipant.groupBy.mock.calls[0][0].where.status).toEqual({ not: 'DISQUALIFIED' });
    expect(prisma.campaignParticipant.groupBy.mock.calls[1][0].where.status).toEqual({ in: ['COMPLETED', 'REWARDED'] });
    expect(prisma.reward.groupBy.mock.calls[0][0].where.status).toBe('CREDITED');
  });

  it('only counts records that are not deleted', async () => {
    await service.forCampaigns(['c-1']);

    expect(prisma.campaignParticipant.groupBy.mock.calls[0][0].where.deletedAt).toBeNull();
    expect(prisma.reward.groupBy.mock.calls[0][0].where.deletedAt).toBeNull();
  });
});
