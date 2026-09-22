import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { INSIGHTS, InsightCode, InsightSeverity } from '../constants';
import { CampaignPerformance } from '../interfaces';

import { MerchantInsightsService } from './merchant-insights.service';

const DAY = 24 * 60 * 60 * 1000;

const campaign = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  title: 'Summer reviews',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  totalBudget: 1000,
  spentBudget: 500,
  startAt: new Date(Date.now() - 10 * DAY),
  endAt: new Date(Date.now() + 10 * DAY),
  ...overrides,
});

const perf = (campaignId: string, overrides: Partial<CampaignPerformance> = {}): CampaignPerformance => ({
  campaignId,
  joins: 30,
  finished: 20,
  completionRate: 0.66,
  completions: 20,
  rewardsPaid: 1000,
  ...overrides,
});

describe('MerchantInsightsService', () => {
  const prisma = { campaign: { findMany: jest.fn() }, taskSubmission: { groupBy: jest.fn() } };
  const merchantRepository = { findById: jest.fn() };
  const performanceService = { forCampaigns: jest.fn() };
  let service: MerchantInsightsService;

  const givenCampaigns = (campaigns: ReturnType<typeof campaign>[], performances: CampaignPerformance[] = []) => {
    prisma.campaign.findMany.mockResolvedValue(campaigns);
    performanceService.forCampaigns.mockResolvedValue(new Map(performances.map((p) => [p.campaignId, p])));
  };
  const givenReviewed = (approved: number, rejected: number) =>
    prisma.taskSubmission.groupBy.mockResolvedValue([
      { status: 'APPROVED', _count: { _all: approved } },
      { status: 'REJECTED', _count: { _all: rejected } },
    ]);
  const codes = async () => (await service.getInsights('m-1')).suggestions.map((s) => s.code);

  beforeEach(() => {
    jest.resetAllMocks();
    merchantRepository.findById.mockResolvedValue({ id: 'm-1', commissionRate: 0.1 });
    prisma.taskSubmission.groupBy.mockResolvedValue([]);
    givenCampaigns([]);
    service = new MerchantInsightsService(prisma as never, merchantRepository as never, performanceService as never);
  });

  it('throws when the merchant does not exist', async () => {
    merchantRepository.findById.mockResolvedValue(null);
    await expect(service.getInsights('m-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('summary', () => {
    it('says there is nothing to look at when no campaign has run', async () => {
      const result = await service.getInsights('m-1');

      expect(result.summary).toMatchObject({ campaignsAnalysed: 0, completions: 0, costPerCompletion: null, approvalRate: null });
      expect(result.suggestions.map((s) => s.code)).toEqual([InsightCode.NOT_ENOUGH_DATA]);
      expect(result.byType).toEqual([]);
    });

    it('works out what each completed task cost, and the fee separately', async () => {
      givenCampaigns(
        [campaign({ id: 'a' }), campaign({ id: 'b' })],
        [perf('a', { joins: 30, finished: 15, completions: 10, rewardsPaid: 500 }), perf('b', { joins: 10, finished: 5, completions: 20, rewardsPaid: 1000 })],
      );

      const { summary } = await service.getInsights('m-1');

      expect(summary.rewardsPaid).toBe(1500);
      expect(summary.completions).toBe(30);
      expect(summary.costPerCompletion).toBe(50);
      expect(summary.platformFeeRate).toBe(0.1);
      expect(summary.estimatedPlatformFee).toBe(150);
      expect(summary.joins).toBe(40);
      expect(summary.completionRate).toBe(0.5);
    });

    it('leaves the cost per completed task empty until something was completed', async () => {
      givenCampaigns([campaign()], [perf('c-1', { completions: 0, rewardsPaid: 0 })]);

      expect((await service.getInsights('m-1')).summary.costPerCompletion).toBeNull();
    });

    it('gives an approval rate only once enough submissions were reviewed', async () => {
      givenCampaigns([campaign()], [perf('c-1')]);
      givenReviewed(3, 2);
      expect((await service.getInsights('m-1')).summary.approvalRate).toBeNull();

      givenReviewed(15, 5);
      expect((await service.getInsights('m-1')).summary.approvalRate).toBe(0.75);
    });

    it('splits the results by campaign type, most completions first', async () => {
      givenCampaigns(
        [campaign({ id: 'a', campaignType: 'REVIEW' }), campaign({ id: 'b', campaignType: 'SURVEY' }), campaign({ id: 'c', campaignType: 'REVIEW' })],
        [
          perf('a', { completions: 5, rewardsPaid: 250, joins: 10, finished: 5 }),
          perf('b', { completions: 20, rewardsPaid: 400, joins: 25, finished: 20 }),
          perf('c', { completions: 5, rewardsPaid: 250, joins: 10, finished: 5 }),
        ],
      );

      const { byType } = await service.getInsights('m-1');

      expect(byType.map((t) => t.campaignType)).toEqual(['SURVEY', 'REVIEW']);
      expect(byType[1]).toMatchObject({ campaigns: 2, completions: 10, rewardsPaid: 500, costPerCompletion: 50, completionRate: 0.5 });
    });

    it('states plainly that revenue is not included', async () => {
      expect((await service.getInsights('m-1')).note).toMatch(/do not include what those tasks earned you/);
    });

    it('only looks at campaigns that ran, in the window or live now', async () => {
      await service.getInsights('m-1');

      const where = prisma.campaign.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'] });
      expect(where.deletedAt).toBeNull();
      expect(where.OR).toEqual([{ createdAt: { gte: expect.any(Date) } }, { status: 'ACTIVE' }]);
    });
  });

  describe('suggestions', () => {
    it('tells a merchant with no live campaign', async () => {
      givenCampaigns([campaign({ status: 'COMPLETED' })], [perf('c-1')]);
      expect(await codes()).toContain(InsightCode.NO_LIVE_CAMPAIGN);
    });

    it('does not say so when a campaign is live', async () => {
      givenCampaigns([campaign()], [perf('c-1')]);
      expect(await codes()).not.toContain(InsightCode.NO_LIVE_CAMPAIGN);
    });

    it('flags a campaign many joined but few finished', async () => {
      givenCampaigns([campaign()], [perf('c-1', { joins: 40, finished: 4, completionRate: 0.1 })]);

      const result = await service.getInsights('m-1');
      const low = result.suggestions.find((s) => s.code === InsightCode.LOW_COMPLETION);

      expect(low).toMatchObject({ severity: InsightSeverity.WARNING, campaignId: 'c-1' });
      expect(low?.detail).toMatch(/40 people joined but only 10% finished/);
    });

    it('does not flag low completion when too few people joined to tell', async () => {
      givenCampaigns([campaign()], [perf('c-1', { joins: INSIGHTS.lowCompletionMinJoins - 1, finished: 0, completionRate: 0 })]);
      expect(await codes()).not.toContain(InsightCode.LOW_COMPLETION);
    });

    it('does not flag a campaign that is completed well', async () => {
      givenCampaigns([campaign()], [perf('c-1', { joins: 40, finished: 30, completionRate: 0.75 })]);
      expect(await codes()).not.toContain(InsightCode.LOW_COMPLETION);
    });

    it('flags a live campaign nobody joined after a few days', async () => {
      givenCampaigns([campaign({ startAt: new Date(Date.now() - 5 * DAY) })], [perf('c-1', { joins: 0, finished: 0, completionRate: 0, completions: 0, rewardsPaid: 0 })]);
      expect(await codes()).toContain(InsightCode.NOBODY_JOINED);
    });

    it('gives a new campaign time before flagging that nobody joined', async () => {
      givenCampaigns([campaign({ startAt: new Date(Date.now() - 1 * DAY) })], [perf('c-1', { joins: 0, finished: 0, completionRate: 0 })]);
      expect(await codes()).not.toContain(InsightCode.NOBODY_JOINED);
    });

    it('does not say nobody joined a campaign that is already over', async () => {
      givenCampaigns([campaign({ status: 'COMPLETED', startAt: new Date(Date.now() - 20 * DAY) })], [perf('c-1', { joins: 0, finished: 0, completionRate: 0 })]);
      expect(await codes()).not.toContain(InsightCode.NOBODY_JOINED);
    });

    it('flags a live campaign that will run out of budget before it ends', async () => {
      givenCampaigns([campaign({ spentBudget: 850 })], [perf('c-1')]);

      const running = (await service.getInsights('m-1')).suggestions.find((s) => s.code === InsightCode.BUDGET_RUNNING_OUT);

      expect(running?.severity).toBe(InsightSeverity.OPPORTUNITY);
      expect(running?.detail).toMatch(/85% of the budget is used/);
    });

    it('flags a live campaign with no end date that is nearly out of budget', async () => {
      givenCampaigns([campaign({ spentBudget: 900, endAt: null })], [perf('c-1')]);
      expect(await codes()).toContain(InsightCode.BUDGET_RUNNING_OUT);
    });

    it('does not flag a nearly spent campaign that is about to end anyway', async () => {
      givenCampaigns([campaign({ spentBudget: 900, endAt: new Date(Date.now() + 1 * DAY) })], [perf('c-1')]);
      expect(await codes()).not.toContain(InsightCode.BUDGET_RUNNING_OUT);
    });

    it('flags a campaign ending soon with most of its budget left', async () => {
      givenCampaigns([campaign({ spentBudget: 100, endAt: new Date(Date.now() + 2 * DAY) })], [perf('c-1')]);
      expect(await codes()).toContain(InsightCode.ENDING_WITH_BUDGET_LEFT);
    });

    it('does not flag a campaign that has already ended, or one with plenty of time', async () => {
      givenCampaigns(
        [campaign({ id: 'a', spentBudget: 100, endAt: new Date(Date.now() - DAY) }), campaign({ id: 'b', spentBudget: 100, endAt: new Date(Date.now() + 20 * DAY) })],
        [perf('a'), perf('b')],
      );
      expect(await codes()).not.toContain(InsightCode.ENDING_WITH_BUDGET_LEFT);
    });

    it('flags many rejected submissions, but only once enough were reviewed', async () => {
      givenCampaigns([campaign()], [perf('c-1')]);
      givenReviewed(3, 4);
      expect(await codes()).not.toContain(InsightCode.HIGH_REJECTION);

      givenReviewed(10, 10);
      expect(await codes()).toContain(InsightCode.HIGH_REJECTION);
    });

    it('does not flag a normal rejection rate', async () => {
      givenCampaigns([campaign()], [perf('c-1')]);
      givenReviewed(18, 2);
      expect(await codes()).not.toContain(InsightCode.HIGH_REJECTION);
    });

    it('names the campaign type that costs least per result when the difference is real', async () => {
      givenCampaigns(
        [campaign({ id: 'a', campaignType: 'REVIEW' }), campaign({ id: 'b', campaignType: 'SURVEY' })],
        [perf('a', { completions: 20, rewardsPaid: 2000 }), perf('b', { completions: 20, rewardsPaid: 400 })],
      );

      const cheapest = (await service.getInsights('m-1')).suggestions.find((s) => s.code === InsightCode.CHEAPEST_TYPE);

      expect(cheapest?.detail).toBe('Survey campaigns cost you Rs 20 per completed task, against Rs 100 for Review.');
    });

    it('says nothing about type cost when the difference is small or there is too little to compare', async () => {
      givenCampaigns(
        [campaign({ id: 'a', campaignType: 'REVIEW' }), campaign({ id: 'b', campaignType: 'SURVEY' })],
        [perf('a', { completions: 20, rewardsPaid: 1000 }), perf('b', { completions: 20, rewardsPaid: 1100 })],
      );
      expect(await codes()).not.toContain(InsightCode.CHEAPEST_TYPE);

      givenCampaigns(
        [campaign({ id: 'a', campaignType: 'REVIEW' }), campaign({ id: 'b', campaignType: 'SURVEY' })],
        [perf('a', { completions: 20, rewardsPaid: 2000 }), perf('b', { completions: 2, rewardsPaid: 20 })],
      );
      expect(await codes()).not.toContain(InsightCode.CHEAPEST_TYPE);
    });

    it('lists warnings before opportunities before information, and no more than the limit', async () => {
      const many = Array.from({ length: 12 }, (_, i) => campaign({ id: `c-${i}`, title: `Campaign ${i}` }));
      givenCampaigns(many, many.map((c) => perf(c.id, { joins: 40, finished: 2, completionRate: 0.05 })));

      const { suggestions } = await service.getInsights('m-1');

      expect(suggestions).toHaveLength(INSIGHTS.maxSuggestions);
      const order = { WARNING: 0, OPPORTUNITY: 1, INFO: 2 };
      const severities = suggestions.map((s) => order[s.severity]);
      expect(severities).toEqual([...severities].sort((a, b) => a - b));
    });
  });
});
