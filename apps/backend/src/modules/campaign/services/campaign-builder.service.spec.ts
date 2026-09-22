import { CampaignType } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { CampaignGoal, GOAL_PROFILES } from '../constants';
import { RecommendCampaignDto } from '../dto';
import { CampaignPolicyViolationException } from '../exceptions/policy-violation.exception';

import { CampaignBuilderService } from './campaign-builder.service';
import { CampaignPolicyService } from './campaign-policy.service';

describe('CampaignBuilderService', () => {
  const prisma = { campaign: { findMany: jest.fn() } };
  const merchantRepository = { findById: jest.fn() };
  const performanceService = { forCampaigns: jest.fn() };

  // findMany answers two questions: platform history (no merchant filter) and this merchant's own campaigns.
  let platformHistory: unknown[] = [];
  let ownCampaigns: unknown[] = [];
  const results = (entries: Record<string, { joins: number; completionRate: number }>) =>
    new Map(Object.entries(entries).map(([id, r]) => [id, { campaignId: id, finished: 0, completions: 0, rewardsPaid: 0, ...r }]));
  let service: CampaignBuilderService;

  const merchant = { id: 'm-1', businessName: 'Brew Bar', commissionRate: 0.1 };
  const ask = (overrides: Partial<RecommendCampaignDto> = {}): RecommendCampaignDto =>
    ({ goal: CampaignGoal.MORE_REVIEWS, budget: 5000, ...overrides }) as RecommendCampaignDto;

  beforeEach(() => {
    jest.resetAllMocks();
    merchantRepository.findById.mockResolvedValue(merchant);
    platformHistory = [];
    ownCampaigns = [];
    prisma.campaign.findMany.mockImplementation(async (args: { where: { merchantId?: string } }) =>
      args.where.merchantId ? ownCampaigns : platformHistory,
    );
    performanceService.forCampaigns.mockResolvedValue(new Map());
    // The real policy service: it only needs a database for whole campaigns, which the builder never checks.
    const policyService = new CampaignPolicyService({} as never);
    service = new CampaignBuilderService(prisma as never, merchantRepository as never, performanceService as never, policyService);
  });

  it('throws when the merchant does not exist', async () => {
    merchantRepository.findById.mockResolvedValue(null);
    await expect(service.recommend('m-x', ask())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an offer line that asks for a rating, and names the words', async () => {
    const failure = await service.recommend('m-1', ask({ highlight: 'Free coffee for a 5 star review' })).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(CampaignPolicyViolationException);
    expect((failure as CampaignPolicyViolationException).getStatus()).toBe(422);
  });

  it('accepts an offer line that only describes the offer', async () => {
    await expect(service.recommend('m-1', ask({ highlight: 'Free filter coffee with any snack' }))).resolves.toBeDefined();
  });

  it('maps every goal to a campaign type, with a valid draft', async () => {
    for (const goal of Object.values(CampaignGoal)) {
      const { draft } = await service.recommend('m-1', ask({ goal }));
      expect(draft.campaignType).toBe(GOAL_PROFILES[goal].campaignType);
      // Must satisfy CreateCampaignDto so it can be posted as it is.
      expect(draft.title.length).toBeGreaterThanOrEqual(5);
      expect(draft.title.length).toBeLessThanOrEqual(200);
      expect(draft.description.length).toBeGreaterThanOrEqual(20);
      expect(draft.shortDescription.length).toBeLessThanOrEqual(300);
    }
  });

  it('uses the default reward when there is not enough history, and says so', async () => {
    const result = await service.recommend('m-1', ask());

    expect(result.draft.rewardAmount).toBe(50);
    expect(result.benchmark).toEqual({ source: 'defaults', sampleSize: 0 });
    expect(result.rationale.join(' ')).toMatch(/not enough platform history/);
  });

  it('uses the median reward of past campaigns that drew people once there are enough', async () => {
    platformHistory = [30, 40, 60, 80, 100].map((rewardAmount) => ({ rewardAmount }));

    const result = await service.recommend('m-1', ask());

    expect(result.draft.rewardAmount).toBe(60);
    expect(result.benchmark).toEqual({ source: 'platform-history', sampleSize: 5 });
  });

  it('keeps a historical median inside the range that makes sense for the goal', async () => {
    platformHistory = [1, 1, 1, 1, 1].map((rewardAmount) => ({ rewardAmount }));

    const result = await service.recommend('m-1', ask());

    expect(result.draft.rewardAmount).toBe(GOAL_PROFILES[CampaignGoal.MORE_REVIEWS].minReward);
  });

  it('pays whole rewards: budget, participants and reward always add up', async () => {
    const { draft, estimate } = await service.recommend('m-1', ask({ budget: 1050 }));

    expect(draft.rewardAmount).toBe(50);
    expect(estimate.participants).toBe(21);
    expect(draft.maxParticipants).toBe(21);
    expect(draft.totalBudget).toBe(1050);

    const odd = await service.recommend('m-1', ask({ budget: 1090 }));
    expect(odd.draft.totalBudget).toBe(odd.draft.rewardAmount * odd.draft.maxParticipants);
    expect(odd.draft.totalBudget).toBeLessThanOrEqual(1090);
  });

  it('lowers the reward so a small budget still pays at least 20 people', async () => {
    const result = await service.recommend('m-1', ask({ budget: 600 }));

    expect(result.draft.rewardAmount).toBe(30);
    expect(result.estimate.participants).toBe(20);
    expect(result.rationale.join(' ')).toMatch(/lowered to Rs 30/);
  });

  it('never goes below the least worthwhile reward and warns that too few people are paid', async () => {
    const result = await service.recommend('m-1', ask({ budget: 100 }));

    expect(result.draft.rewardAmount).toBe(20);
    expect(result.estimate.participants).toBe(5);
    expect(result.warnings.join(' ')).toMatch(/only pays 5 people/);
  });

  it('shows the platform fee separately, without taking it out of the campaign budget', async () => {
    const { draft, estimate } = await service.recommend('m-1', ask({ budget: 5000 }));

    expect(draft.totalBudget).toBe(5000);
    expect(estimate.platformFeeRate).toBe(0.1);
    expect(estimate.estimatedPlatformFee).toBe(500);
    expect(estimate.totalEstimatedCost).toBe(5500);
  });

  it('handles a merchant with no commission', async () => {
    merchantRepository.findById.mockResolvedValue({ ...merchant, commissionRate: 0 });

    const { estimate, rationale } = await service.recommend('m-1', ask());

    expect(estimate.estimatedPlatformFee).toBe(0);
    expect(rationale.join(' ')).toMatch(/No platform fee/);
  });

  it('sets the dates from the start and the number of days', async () => {
    const { draft } = await service.recommend(
      'm-1',
      ask({ startAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), durationDays: 10 }),
    );

    const days = (new Date(draft.endAt).getTime() - new Date(draft.startAt).getTime()) / 86_400_000;
    expect(days).toBe(10);
  });

  it('starts tomorrow and runs 7 days by default', async () => {
    const before = Date.now();
    const { draft } = await service.recommend('m-1', ask());

    const start = new Date(draft.startAt).getTime();
    expect(start).toBeGreaterThanOrEqual(before + 86_400_000);
    expect(new Date(draft.endAt).getTime() - start).toBe(7 * 86_400_000);
  });

  it('rejects a start date in the past', async () => {
    await expect(
      service.recommend('m-1', ask({ startAt: new Date(Date.now() - 5 * 86_400_000).toISOString() })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('warns about very short campaigns', async () => {
    const { warnings } = await service.recommend('m-1', ask({ durationDays: 2 }));
    expect(warnings.join(' ')).toMatch(/Very short/);
  });

  it('adds the merchant highlight to the description, as written', async () => {
    const { draft } = await service.recommend('m-1', ask({ highlight: 'Free dessert this week' }));
    expect(draft.description).toContain('Special offer: Free dessert this week');
  });

  it('warns when the merchant last similar campaign was joined by many but finished by few', async () => {
    ownCampaigns = [{ id: 'c-1', title: 'Summer reviews' }];
    performanceService.forCampaigns.mockResolvedValue(results({ 'c-1': { joins: 50, completionRate: 0.1 } }));

    const { warnings } = await service.recommend('m-1', ask());

    expect(warnings.join(' ')).toMatch(/"Summer reviews", was joined by 50 people but only 10% finished/);
  });

  it('does not warn when the last similar campaign finished well', async () => {
    ownCampaigns = [{ id: 'c-2', title: 'Good one' }];
    performanceService.forCampaigns.mockResolvedValue(results({ 'c-2': { joins: 50, completionRate: 0.6 } }));

    const { warnings } = await service.recommend('m-1', ask());

    expect(warnings).toEqual([]);
  });

  it('ignores an earlier campaign that too few people joined to judge, and looks at the next one', async () => {
    ownCampaigns = [
      { id: 'small', title: 'Tiny test' },
      { id: 'big', title: 'Big one' },
    ];
    performanceService.forCampaigns.mockResolvedValue(
      results({ small: { joins: 3, completionRate: 0 }, big: { joins: 40, completionRate: 0.1 } }),
    );

    const { warnings } = await service.recommend('m-1', ask());

    expect(warnings.join(' ')).toMatch(/"Big one"/);
    expect(warnings.join(' ')).not.toMatch(/Tiny test/);
  });

  it('gives no warning when this merchant has not run a similar campaign', async () => {
    const { warnings } = await service.recommend('m-1', ask());

    expect(warnings).toEqual([]);
    expect(performanceService.forCampaigns).not.toHaveBeenCalled();
  });

  it('only counts campaigns that actually ran when looking at the merchant own history', async () => {
    await service.recommend('m-1', ask());

    const own = prisma.campaign.findMany.mock.calls.find(([args]: [{ where: { merchantId?: string } }]) => args.where.merchantId)[0];
    expect(own.where.status).toEqual({ in: ['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'] });
    expect(own.where.campaignType).toBe(CampaignType.REVIEW);
  });

  it('only reads campaigns of the same type that were active or completed and drew people', async () => {
    await service.recommend('m-1', ask({ goal: CampaignGoal.APP_INSTALLS }));

    const where = prisma.campaign.findMany.mock.calls[0][0].where;
    expect(where.campaignType).toBe(CampaignType.APP_INSTALL);
    expect(where.status).toEqual({ in: ['ACTIVE', 'COMPLETED'] });
    expect(where.currentParticipants).toEqual({ gte: 10 });
    expect(where.deletedAt).toBeNull();
  });

  it('asks for social reach only where it matters', async () => {
    const share = await service.recommend('m-1', ask({ goal: CampaignGoal.SPREAD_THE_WORD }));
    const review = await service.recommend('m-1', ask({ goal: CampaignGoal.MORE_REVIEWS }));

    expect(share.draft.minimumFollowers).toBe(100);
    expect(review.draft.minimumFollowers).toBe(0);
  });

  it('never turns on auto-approval by itself', async () => {
    const { draft } = await service.recommend('m-1', ask());
    expect(draft.autoApprove).toBe(false);
  });
});
