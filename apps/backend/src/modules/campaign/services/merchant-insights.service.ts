import { Injectable } from '@nestjs/common';
import { CampaignType } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { MerchantRepository } from '../../merchant/repositories';
import { INSIGHTS, INSIGHTS_NOTE, InsightCode, InsightSeverity, RAN_STATUSES, SEVERITY_ORDER } from '../constants';
import { CampaignPerformance, CampaignTypeResult, InsightSuggestion, MerchantInsights } from '../interfaces';

import { CampaignPerformanceService } from './campaign-performance.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The parts of a campaign the rules need. */
interface InsightCampaign {
  id: string;
  title: string;
  campaignType: CampaignType;
  status: string;
  totalBudget: unknown;
  spentBudget: unknown;
  startAt: Date | null;
  endAt: Date | null;
}

/**
 * Turns a merchant's campaign results into plain suggestions for getting more out of their budget.
 *
 * WHY fixed rules and not a language model: each suggestion points at a real campaign and a real number, so
 * the merchant can check it. A model could talk about results that are not there. The same data always gives
 * the same advice, and every rule and threshold is in the insights constants.
 */
@Injectable()
export class MerchantInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantRepository: MerchantRepository,
    private readonly performanceService: CampaignPerformanceService,
  ) {}

  async getInsights(merchantId: string): Promise<MerchantInsights> {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const now = Date.now();
    const since = new Date(now - INSIGHTS.windowDays * DAY_MS);

    // Campaigns that ran in the window, plus any that are live now however old they are.
    const campaigns: InsightCampaign[] = await this.prisma.campaign.findMany({
      where: {
        merchantId,
        deletedAt: null,
        status: { in: [...RAN_STATUSES] },
        OR: [{ createdAt: { gte: since } }, { status: 'ACTIVE' }],
      },
      orderBy: { createdAt: 'desc' },
      take: INSIGHTS.maxCampaigns,
      select: { id: true, title: true, campaignType: true, status: true, totalBudget: true, spentBudget: true, startAt: true, endAt: true },
    });

    const performance = await this.performanceService.forCampaigns(campaigns.map((c) => c.id));
    const reviewed = await this.countReviewedSubmissions(merchantId, since);

    const byType = this.groupByType(campaigns, performance);
    const totals = byType.reduce(
      (sum, t) => ({ joins: sum.joins + t.joins, completions: sum.completions + t.completions, rewardsPaid: sum.rewardsPaid + t.rewardsPaid }),
      { joins: 0, completions: 0, rewardsPaid: 0 },
    );
    const finishedTotal = campaigns.reduce((sum, c) => sum + (performance.get(c.id)?.finished ?? 0), 0);
    const feeRate = Number(merchant.commissionRate);

    const reviewedTotal = reviewed.approved + reviewed.rejected;
    return {
      windowDays: INSIGHTS.windowDays,
      summary: {
        campaignsAnalysed: campaigns.length,
        joins: totals.joins,
        completions: totals.completions,
        rewardsPaid: this.round2(totals.rewardsPaid),
        costPerCompletion: totals.completions > 0 ? this.round2(totals.rewardsPaid / totals.completions) : null,
        platformFeeRate: feeRate,
        estimatedPlatformFee: this.round2(totals.rewardsPaid * feeRate),
        completionRate: totals.joins > 0 ? this.round4(Math.min(1, finishedTotal / totals.joins)) : 0,
        approvalRate: reviewedTotal >= INSIGHTS.approvalMinReviewed ? this.round4(reviewed.approved / reviewedTotal) : null,
      },
      byType,
      suggestions: this.buildSuggestions(campaigns, performance, byType, reviewed, now),
      note: INSIGHTS_NOTE,
    };
  }

  /** How many submissions on this merchant's campaigns were approved and rejected in the window. */
  private async countReviewedSubmissions(merchantId: string, since: Date): Promise<{ approved: number; rejected: number }> {
    const rows = await this.prisma.taskSubmission.groupBy({
      by: ['status'],
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        deletedAt: null,
        createdAt: { gte: since },
        participant: { campaign: { merchantId } },
      },
      _count: { _all: true },
    });
    const count = (status: string) => rows.find((r) => r.status === status)?._count._all ?? 0;
    return { approved: count('APPROVED'), rejected: count('REJECTED') };
  }

  private groupByType(campaigns: InsightCampaign[], performance: Map<string, CampaignPerformance>): CampaignTypeResult[] {
    const groups = new Map<CampaignType, { campaigns: number; joins: number; finished: number; completions: number; rewardsPaid: number }>();
    for (const campaign of campaigns) {
      const perf = performance.get(campaign.id);
      const group = groups.get(campaign.campaignType) ?? { campaigns: 0, joins: 0, finished: 0, completions: 0, rewardsPaid: 0 };
      group.campaigns += 1;
      group.joins += perf?.joins ?? 0;
      group.finished += perf?.finished ?? 0;
      group.completions += perf?.completions ?? 0;
      group.rewardsPaid += perf?.rewardsPaid ?? 0;
      groups.set(campaign.campaignType, group);
    }

    return [...groups.entries()]
      .map(([campaignType, g]) => ({
        campaignType,
        campaigns: g.campaigns,
        joins: g.joins,
        completions: g.completions,
        rewardsPaid: this.round2(g.rewardsPaid),
        costPerCompletion: g.completions > 0 ? this.round2(g.rewardsPaid / g.completions) : null,
        completionRate: g.joins > 0 ? this.round4(Math.min(1, g.finished / g.joins)) : 0,
      }))
      .sort((a, b) => b.completions - a.completions || a.campaignType.localeCompare(b.campaignType));
  }

  private buildSuggestions(
    campaigns: InsightCampaign[],
    performance: Map<string, CampaignPerformance>,
    byType: CampaignTypeResult[],
    reviewed: { approved: number; rejected: number },
    now: number,
  ): InsightSuggestion[] {
    const suggestions: InsightSuggestion[] = [];

    if (!campaigns.length) {
      return [
        {
          code: InsightCode.NOT_ENOUGH_DATA,
          severity: InsightSeverity.INFO,
          title: 'No campaigns to look at yet',
          detail: 'Once you have run a campaign, this page shows what it cost per completed task and what could work better.',
        },
      ];
    }

    if (!campaigns.some((c) => c.status === 'ACTIVE')) {
      suggestions.push({
        code: InsightCode.NO_LIVE_CAMPAIGN,
        severity: InsightSeverity.INFO,
        title: 'You have no live campaign',
        detail: 'Nothing is running right now, so no one can earn from your business. Plan a new campaign to keep customers coming.',
      });
    }

    for (const campaign of campaigns) {
      const perf = performance.get(campaign.id);
      const joins = perf?.joins ?? 0;
      const isLive = campaign.status === 'ACTIVE';
      const startedDaysAgo = campaign.startAt ? (now - campaign.startAt.getTime()) / DAY_MS : 0;

      if (joins >= INSIGHTS.lowCompletionMinJoins && (perf?.completionRate ?? 0) < INSIGHTS.lowCompletionRate) {
        suggestions.push({
          code: InsightCode.LOW_COMPLETION,
          severity: InsightSeverity.WARNING,
          campaignId: campaign.id,
          title: `Few people finish "${campaign.title}"`,
          detail: `${joins} people joined but only ${this.percent(perf?.completionRate ?? 0)} finished. Try making the task simpler, or raise the reward a little.`,
        });
      }

      if (isLive && joins === 0 && startedDaysAgo >= INSIGHTS.nobodyJoinedAfterDays) {
        suggestions.push({
          code: InsightCode.NOBODY_JOINED,
          severity: InsightSeverity.WARNING,
          campaignId: campaign.id,
          title: `Nobody has joined "${campaign.title}" yet`,
          detail: `It has been live for ${Math.floor(startedDaysAgo)} days. Check that the title is clear, the reward is worth the effort, and the audience is not too narrow.`,
        });
      }

      if (isLive) {
        const total = Number(campaign.totalBudget);
        const spentShare = total > 0 ? Number(campaign.spentBudget) / total : 0;
        const daysLeft = campaign.endAt ? (campaign.endAt.getTime() - now) / DAY_MS : null;

        if (spentShare >= INSIGHTS.budgetRunningOutShare && (daysLeft === null || daysLeft > INSIGHTS.budgetRunningOutMinDaysLeft)) {
          suggestions.push({
            code: InsightCode.BUDGET_RUNNING_OUT,
            severity: InsightSeverity.OPPORTUNITY,
            campaignId: campaign.id,
            title: `"${campaign.title}" is running out of budget`,
            detail: `${this.percent(spentShare)} of the budget is used${daysLeft === null ? '' : ` with about ${Math.floor(daysLeft)} days left`}. It will stop early unless you plan a follow-up campaign.`,
          });
        }

        if (daysLeft !== null && daysLeft > 0 && daysLeft <= INSIGHTS.endingSoonDays && spentShare < INSIGHTS.endingLowUseShare) {
          suggestions.push({
            code: InsightCode.ENDING_WITH_BUDGET_LEFT,
            severity: InsightSeverity.OPPORTUNITY,
            campaignId: campaign.id,
            title: `"${campaign.title}" ends soon with most of its budget unused`,
            detail: `Only ${this.percent(spentShare)} of the budget is used and it ends in about ${Math.ceil(daysLeft)} days. The reward may be too low, or the campaign is not reaching enough people.`,
          });
        }
      }
    }

    const reviewedTotal = reviewed.approved + reviewed.rejected;
    if (reviewedTotal >= INSIGHTS.rejectionMinReviewed && reviewed.rejected / reviewedTotal >= INSIGHTS.highRejectionRate) {
      suggestions.push({
        code: InsightCode.HIGH_REJECTION,
        severity: InsightSeverity.WARNING,
        title: 'Many submissions are being rejected',
        detail: `${this.percent(reviewed.rejected / reviewedTotal)} of reviewed submissions were rejected. Spell out exactly what proof is needed in the campaign description so people get it right the first time.`,
      });
    }

    const cheapest = this.cheapestTypeInsight(byType);
    if (cheapest) suggestions.push(cheapest);

    return suggestions
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
      .slice(0, INSIGHTS.maxSuggestions);
  }

  /** Names the campaign type that gets the merchant results most cheaply, when the difference is worth mentioning. */
  private cheapestTypeInsight(byType: CampaignTypeResult[]): InsightSuggestion | null {
    const comparable = byType.filter(
      (t): t is CampaignTypeResult & { costPerCompletion: number } =>
        t.costPerCompletion !== null && t.completions >= INSIGHTS.cheapestTypeMinCompletions,
    );
    if (comparable.length < 2) return null;

    const sorted = [...comparable].sort((a, b) => a.costPerCompletion - b.costPerCompletion);
    const cheapest = sorted[0];
    const dearest = sorted[sorted.length - 1];
    if (dearest.costPerCompletion / cheapest.costPerCompletion < INSIGHTS.cheapestTypeMinRatio) return null;

    return {
      code: InsightCode.CHEAPEST_TYPE,
      severity: InsightSeverity.INFO,
      title: 'Some campaign types cost you less per result',
      detail: `${this.typeName(cheapest.campaignType)} campaigns cost you Rs ${cheapest.costPerCompletion} per completed task, against Rs ${dearest.costPerCompletion} for ${this.typeName(dearest.campaignType)}.`,
    };
  }

  private typeName(type: CampaignType): string {
    return type
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private percent(fraction: number): string {
    return `${Math.round(fraction * 100)}%`;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private round4(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}
