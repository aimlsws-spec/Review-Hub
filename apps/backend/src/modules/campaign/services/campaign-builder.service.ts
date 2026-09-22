import { Injectable } from '@nestjs/common';
import { RewardType } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { MerchantRepository } from '../../merchant/repositories';
import {
  DEFAULT_CAMPAIGN_DURATION_DAYS,
  GOAL_PROFILES,
  GoalProfile,
  HISTORY_MIN_JOINED,
  HISTORY_SAMPLE_LIMIT,
  MIN_HISTORY_SAMPLE,
  OWN_HISTORY_LOW_COMPLETION,
  OWN_HISTORY_LOOKBACK,
  OWN_HISTORY_MIN_JOINS,
  RAN_STATUSES,
  SMALL_CAMPAIGN_PARTICIPANTS,
  TARGET_MIN_PARTICIPANTS,
} from '../constants';
import { RecommendCampaignDto } from '../dto';
import { CampaignRecommendation, RewardBenchmarkSource } from '../interfaces';

import { CampaignPerformanceService } from './campaign-performance.service';
import { CampaignPolicyService } from './campaign-policy.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recommends a campaign from a merchant's goal and budget.
 *
 * WHY rules and not a language model: every number here is money. The reward, how many people the budget
 * pays and the platform fee are worked out with plain arithmetic from the goal, the budget, the merchant's
 * commission rate and what has worked on the platform before, so the same input always gives the same,
 * explainable answer. The result is only a draft; the merchant edits it and creates the campaign themselves.
 */
@Injectable()
export class CampaignBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantRepository: MerchantRepository,
    private readonly performanceService: CampaignPerformanceService,
    private readonly policyService: CampaignPolicyService,
  ) {}

  async recommend(merchantId: string, dto: RecommendCampaignDto): Promise<CampaignRecommendation> {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    // The offer line is copied into the description as written, so it has to meet the same wording rules.
    this.policyService.assertAllowed([{ field: 'special offer', text: dto.highlight }], 'recommended');

    const profile = GOAL_PROFILES[dto.goal];
    const rationale: string[] = [];
    const warnings: string[] = [];

    const { startAt, endAt } = this.resolveDates(dto);

    const benchmark = await this.findBenchmarkReward(profile);
    const baseReward = benchmark.reward ?? profile.defaultReward;
    rationale.push(
      benchmark.source === 'platform-history'
        ? `Rs ${baseReward} per person is the typical reward on campaigns like this that attracted people (${benchmark.sampleSize} campaigns).`
        : `Rs ${baseReward} per person is a starting point for this kind of campaign. There is not enough platform history yet to base it on real results.`,
    );

    const reward = this.chooseReward(dto.budget, baseReward, profile, rationale);
    const participants = Math.floor(dto.budget / reward);
    // The budget is rounded down to what the participants can actually be paid so nothing is left stuck over.
    const totalBudget = this.round2(participants * reward);
    if (totalBudget < dto.budget) {
      rationale.push(`Budget set to Rs ${totalBudget} so it divides exactly into ${participants} rewards of Rs ${reward}.`);
    }

    if (participants < SMALL_CAMPAIGN_PARTICIPANTS) {
      warnings.push(
        `This budget only pays ${participants} ${participants === 1 ? 'person' : 'people'}. That is too few to learn whether the campaign works; consider a bigger budget.`,
      );
    }
    if (dto.durationDays !== undefined && dto.durationDays < 3) {
      warnings.push('Very short campaigns give people little time to find and finish the task.');
    }
    warnings.push(...(await this.ownHistoryWarnings(merchantId, profile)));

    const feeRate = Number(merchant.commissionRate);
    const estimatedPlatformFee = this.round2(totalBudget * feeRate);
    rationale.push(
      feeRate > 0
        ? `The platform fee is ${this.round2(feeRate * 100)}% of what is actually spent. It is billed separately when you settle, so it is not taken out of the campaign budget.`
        : 'No platform fee applies to this account.',
    );

    const businessName = merchant.businessName.slice(0, 80);
    const description = this.buildDescription(profile, businessName, dto.highlight);

    return {
      goal: dto.goal,
      draft: {
        title: profile.title(businessName),
        shortDescription: profile.shortDescription,
        description,
        campaignType: profile.campaignType,
        rewardType: RewardType.CASH,
        rewardAmount: reward,
        totalBudget,
        maxParticipants: participants,
        minimumFollowers: profile.minimumFollowers,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        autoApprove: false,
      },
      estimate: {
        participants,
        rewardSpend: totalBudget,
        platformFeeRate: feeRate,
        estimatedPlatformFee,
        totalEstimatedCost: this.round2(totalBudget + estimatedPlatformFee),
      },
      benchmark: { source: benchmark.source, sampleSize: benchmark.sampleSize },
      rationale,
      warnings,
    };
  }

  /**
   * Picks the reward per person. It starts from the benchmark but is lowered when the budget would otherwise
   * pay fewer than TARGET_MIN_PARTICIPANTS people, and never goes outside the range that makes sense for the goal.
   */
  private chooseReward(budget: number, baseReward: number, profile: GoalProfile, rationale: string[]): number {
    const affordable = Math.floor(budget / TARGET_MIN_PARTICIPANTS);
    let reward = Math.min(baseReward, affordable);
    reward = Math.max(profile.minReward, Math.min(profile.maxReward, reward));
    reward = Math.min(reward, Math.floor(budget)); // never a reward bigger than the whole budget

    if (reward < baseReward) {
      rationale.push(
        reward === profile.minReward && affordable < profile.minReward
          ? `The reward was lowered to Rs ${reward}, the least that is still worth doing for this task.`
          : `The reward was lowered to Rs ${reward} so the budget pays at least ${TARGET_MIN_PARTICIPANTS} people.`,
      );
    }
    return reward;
  }

  /**
   * The typical reward of past campaigns of this type that actually drew people. Only used when there are
   * enough of them; otherwise the built-in default is used and the merchant is told so.
   */
  private async findBenchmarkReward(
    profile: GoalProfile,
  ): Promise<{ reward: number | null; source: RewardBenchmarkSource; sampleSize: number }> {
    const past = await this.prisma.campaign.findMany({
      where: {
        campaignType: profile.campaignType,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        currentParticipants: { gte: HISTORY_MIN_JOINED },
        deletedAt: null,
      },
      select: { rewardAmount: true },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_SAMPLE_LIMIT,
    });

    if (past.length < MIN_HISTORY_SAMPLE) {
      return { reward: null, source: 'defaults', sampleSize: past.length };
    }

    const median = this.median(past.map((row) => Number(row.rewardAmount)));
    const clamped = Math.max(profile.minReward, Math.min(profile.maxReward, Math.round(median)));
    return { reward: clamped, source: 'platform-history', sampleSize: past.length };
  }

  /** Warns when this merchant's own latest campaign of the same kind finished with few people completing it. */
  private async ownHistoryWarnings(merchantId: string, profile: GoalProfile): Promise<string[]> {
    const recent = await this.prisma.campaign.findMany({
      where: { merchantId, campaignType: profile.campaignType, deletedAt: null, status: { in: [...RAN_STATUSES] } },
      orderBy: { createdAt: 'desc' },
      take: OWN_HISTORY_LOOKBACK,
      select: { id: true, title: true },
    });
    if (!recent.length) return [];

    // Results are counted from who joined and who finished; the analytics table is not filled in by anything.
    const performance = await this.performanceService.forCampaigns(recent.map((c) => c.id));
    const previous = recent.find((c) => (performance.get(c.id)?.joins ?? 0) >= OWN_HISTORY_MIN_JOINS);
    const result = previous ? performance.get(previous.id) : undefined;

    if (previous && result && result.completionRate < OWN_HISTORY_LOW_COMPLETION) {
      return [
        `Your last similar campaign, "${previous.title}", was joined by ${result.joins} people but only ${this.round2(result.completionRate * 100)}% finished it. Keep the task simple, or consider a slightly higher reward.`,
      ];
    }
    return [];
  }

  private resolveDates(dto: RecommendCampaignDto): { startAt: Date; endAt: Date } {
    const now = Date.now();
    const startAt = dto.startAt ? new Date(dto.startAt) : new Date(now + DAY_MS);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() < now - DAY_MS) {
      throw new BadRequestException('The start date cannot be in the past');
    }
    const days = dto.durationDays ?? DEFAULT_CAMPAIGN_DURATION_DAYS;
    return { startAt, endAt: new Date(startAt.getTime() + days * DAY_MS) };
  }

  /** The merchant's own offer line is added as written; the wording around it is fixed by the goal. */
  private buildDescription(profile: GoalProfile, businessName: string, highlight?: string): string {
    const base = profile.description(businessName);
    return highlight ? `${base} Special offer: ${highlight}` : base;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
