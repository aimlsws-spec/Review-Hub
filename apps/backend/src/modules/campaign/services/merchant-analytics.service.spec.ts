import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { MerchantAnalyticsService } from './merchant-analytics.service';

describe('MerchantAnalyticsService', () => {
  const prisma = {
    campaign: { findFirst: jest.fn(), findMany: jest.fn() },
    taskSubmission: { count: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const performance = { forCampaigns: jest.fn() };
  let service: MerchantAnalyticsService;

  const stats = (overrides: Record<string, unknown> = {}) => ({ campaignId: 'c-1', joins: 10, finished: 4, completionRate: 0.4, completions: 5, rewardsPaid: 250, ...overrides });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new MerchantAnalyticsService(prisma as never, performance as never);
  });

  describe('one campaign', () => {
    beforeEach(() => {
      prisma.campaign.findFirst.mockResolvedValue({ id: 'c-1', spentBudget: '250.00' });
      performance.forCampaigns.mockResolvedValue(new Map([['c-1', stats()]]));
      prisma.taskSubmission.count.mockResolvedValue(3);
      prisma.$queryRaw.mockResolvedValue([{ seconds: '3600.4' }]);
    });

    it('reports what really happened, from the joins and rewards on record', async () => {
      await expect(service.forCampaign('c-1', 'm-1')).resolves.toEqual({
        joins: 10,
        finished: 4,
        completions: 5,
        rejections: 3,
        completionRate: 0.4,
        budgetUsed: 250,
        rewardPaid: 250,
        avgCompletionSec: 3600,
      });
    });

    it('only looks for the campaign among this merchant’s own', async () => {
      await service.forCampaign('c-1', 'm-1');
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c-1', merchantId: 'm-1', deletedAt: null } }));
    });

    it('says not found for another merchant’s campaign, without saying it exists', async () => {
      prisma.campaign.findFirst.mockResolvedValue(null);

      await expect(service.forCampaign('c-1', 'someone-else')).rejects.toBeInstanceOf(NotFoundException);
      expect(performance.forCampaigns).not.toHaveBeenCalled();
    });

    it('gives zeros for a campaign nobody has joined, not an error', async () => {
      performance.forCampaigns.mockResolvedValue(new Map());
      prisma.taskSubmission.count.mockResolvedValue(0);
      prisma.$queryRaw.mockResolvedValue([{ seconds: null }]);

      await expect(service.forCampaign('c-1', 'm-1')).resolves.toMatchObject({ joins: 0, finished: 0, completions: 0, completionRate: 0, rewardPaid: 0, avgCompletionSec: 0 });
    });

    it('counts the rejections of this campaign’s tasks only', async () => {
      await service.forCampaign('c-1', 'm-1');
      expect(prisma.taskSubmission.count).toHaveBeenCalledWith({ where: { status: 'REJECTED', task: { campaignId: 'c-1' } } });
    });

    it('no longer reports views or a conversion rate, which nothing measures', async () => {
      const result = await service.forCampaign('c-1', 'm-1');
      expect(result).not.toHaveProperty('views');
      expect(result).not.toHaveProperty('conversionRate');
    });
  });

  describe('overview', () => {
    const now = new Date('2026-09-21T10:00:00Z');
    const campaigns = [
      { id: 'c-1', title: 'Brunch', status: 'ACTIVE', totalBudget: '5000', spentBudget: '250' },
      { id: 'c-2', title: 'Dinner', status: 'COMPLETED', totalBudget: '2000', spentBudget: '900' },
      { id: 'c-3', title: 'Nobody joined', status: 'ACTIVE', totalBudget: '1000', spentBudget: '0' },
    ];

    beforeEach(() => {
      prisma.campaign.findMany.mockResolvedValue(campaigns);
      performance.forCampaigns.mockResolvedValue(
        new Map([
          ['c-1', stats({ campaignId: 'c-1', joins: 10, finished: 4, completions: 5, rewardsPaid: 250, completionRate: 0.4 })],
          ['c-2', stats({ campaignId: 'c-2', joins: 20, finished: 18, completions: 18, rewardsPaid: 900, completionRate: 0.9 })],
        ]),
      );
      prisma.$queryRaw.mockResolvedValue([]);
    });

    it('adds up every campaign for the totals', async () => {
      const { totals } = await service.overview('m-1', 30, now);

      expect(totals).toEqual({
        campaigns: 3,
        activeCampaigns: 2,
        joins: 30,
        finished: 22,
        completions: 23,
        completionRate: 22 / 30,
        rewardsPaid: 1150,
        budgetSpent: 1150,
        costPerCompletion: 50,
      });
    });

    it('lists the biggest spenders first, with what each completion cost', async () => {
      const { campaigns: rows } = await service.overview('m-1', 30, now);

      expect(rows.map((row) => row.title)).toEqual(['Dinner', 'Brunch', 'Nobody joined']);
      expect(rows[0]).toMatchObject({ rewardsPaid: 900, completions: 18, costPerCompletion: 50, totalBudget: 2000, spentBudget: 900 });
      expect(rows[2]).toMatchObject({ joins: 0, completionRate: 0, costPerCompletion: null });
    });

    it('has no cost per completion, and no division by zero, when nothing has been completed', async () => {
      performance.forCampaigns.mockResolvedValue(new Map());

      const { totals } = await service.overview('m-1', 30, now);

      expect(totals).toMatchObject({ joins: 0, completionRate: 0, costPerCompletion: null });
    });

    it('copes with a merchant who has no campaigns at all', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      performance.forCampaigns.mockResolvedValue(new Map());

      const result = await service.overview('m-1', 7, now);

      expect(result.totals.campaigns).toBe(0);
      expect(result.campaigns).toEqual([]);
      expect(result.daily).toHaveLength(7);
    });

    it('only asks about this merchant’s campaigns, and not deleted ones', async () => {
      await service.overview('m-1', 30, now);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { merchantId: 'm-1', deletedAt: null } }));
    });

    it('caps the table at 20 campaigns but still counts them all in the totals', async () => {
      const many = Array.from({ length: 25 }, (_, i) => ({ id: `c-${i}`, title: `C${i}`, status: 'ACTIVE', totalBudget: '100', spentBudget: '10' }));
      prisma.campaign.findMany.mockResolvedValue(many);
      performance.forCampaigns.mockResolvedValue(new Map(many.map((c) => [c.id, stats({ campaignId: c.id, joins: 2, finished: 1, completions: 1, rewardsPaid: 10 })])));

      const result = await service.overview('m-1', 30, now);

      expect(result.campaigns).toHaveLength(20);
      expect(result.totals).toMatchObject({ campaigns: 25, joins: 50, rewardsPaid: 250 });
    });

    describe('day by day', () => {
      it('has one entry for every day, oldest first, ending today in India', async () => {
        const { daily, period } = await service.overview('m-1', 7, now);

        expect(daily.map((d) => d.date)).toEqual(['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21']);
        expect(period).toEqual({ days: 7, from: '2026-09-15', to: '2026-09-21' });
      });

      it('counts a moment just after midnight in India as the next day, though it is still the day before in UTC', async () => {
        const lateUtc = new Date('2026-09-21T19:00:00Z');

        const { period } = await service.overview('m-1', 7, lateUtc);

        expect(period.to).toBe('2026-09-22');
      });

      it('puts joins and rewards on their days, and shows zeros for the days when nothing happened', async () => {
        prisma.$queryRaw
          .mockResolvedValueOnce([{ day: new Date('2026-09-20T00:00:00Z'), joins: BigInt(4) }])
          .mockResolvedValueOnce([{ day: new Date('2026-09-21T00:00:00Z'), completions: BigInt(2), amount: '100.50' }]);

        const { daily } = await service.overview('m-1', 7, now);

        expect(daily.find((d) => d.date === '2026-09-20')).toEqual({ date: '2026-09-20', joins: 4, completions: 0, rewardsPaid: 0 });
        expect(daily.find((d) => d.date === '2026-09-21')).toEqual({ date: '2026-09-21', joins: 0, completions: 2, rewardsPaid: 100.5 });
        expect(daily.find((d) => d.date === '2026-09-16')).toEqual({ date: '2026-09-16', joins: 0, completions: 0, rewardsPaid: 0 });
      });

      it('ignores a day outside the period', async () => {
        prisma.$queryRaw.mockResolvedValueOnce([{ day: new Date('2026-01-01T00:00:00Z'), joins: BigInt(9) }]).mockResolvedValueOnce([]);

        const { daily } = await service.overview('m-1', 7, now);

        expect(daily.reduce((sum, d) => sum + d.joins, 0)).toBe(0);
      });
    });
  });
});
