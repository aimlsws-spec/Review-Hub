import { Injectable } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CampaignPerformanceService } from './campaign-performance.service';

const IST_OFFSET_MINUTES = 330;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
/** The most campaigns shown in the table, biggest spenders first. Totals still count every campaign. */
const CAMPAIGN_TABLE_LIMIT = 20;

export interface CampaignAnalytics {
  joins: number;
  finished: number;
  completions: number;
  rejections: number;
  /** finished / joins, 0 to 1. */
  completionRate: number;
  budgetUsed: number;
  rewardPaid: number;
  avgCompletionSec: number;
}

export interface MerchantAnalyticsOverview {
  period: { days: number; from: string; to: string };
  totals: {
    campaigns: number;
    activeCampaigns: number;
    joins: number;
    finished: number;
    completions: number;
    completionRate: number;
    rewardsPaid: number;
    budgetSpent: number;
    /** Reward money spent for each completed task, or null while there are none. */
    costPerCompletion: number | null;
  };
  campaigns: {
    id: string;
    title: string;
    status: CampaignStatus;
    joins: number;
    finished: number;
    completionRate: number;
    completions: number;
    rewardsPaid: number;
    spentBudget: number;
    totalBudget: number;
    costPerCompletion: number | null;
  }[];
  /** One entry for every day in the period, including days when nothing happened. */
  daily: { date: string; joins: number; completions: number; rewardsPaid: number }[];
}

/**
 * What a merchant's campaigns are achieving, counted from the records that drive the money: who joined, who finished, and
 * the rewards actually credited (CampaignPerformanceService). Nothing here reads the CampaignAnalytics table, which nothing
 * fills in. Views are not tracked anywhere, so they are not reported.
 *
 * Days are India days, the same as the platform's other daily figures.
 */
@Injectable()
export class MerchantAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceService: CampaignPerformanceService,
  ) {}

  /** How one campaign is doing. A campaign that is not this merchant's is reported as not found. */
  async forCampaign(campaignId: string, merchantId: string): Promise<CampaignAnalytics> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, merchantId, deletedAt: null },
      select: { id: true, spentBudget: true },
    });
    if (!campaign) throw new NotFoundException('Campaign');

    const [performance, rejections, average] = await Promise.all([
      this.performanceService.forCampaigns([campaignId]),
      this.prisma.taskSubmission.count({ where: { status: 'REJECTED', task: { campaignId } } }),
      this.prisma.$queryRaw<{ seconds: number | null }[]>`
        SELECT AVG(TIMESTAMPDIFF(SECOND, joinedAt, completedAt)) AS seconds
        FROM campaign_participants
        WHERE campaignId = ${campaignId} AND deletedAt IS NULL AND completedAt IS NOT NULL AND status IN ('COMPLETED', 'REWARDED')`,
    ]);

    const stats = performance.get(campaignId);
    return {
      joins: stats?.joins ?? 0,
      finished: stats?.finished ?? 0,
      completions: stats?.completions ?? 0,
      rejections,
      completionRate: stats?.completionRate ?? 0,
      budgetUsed: Number(campaign.spentBudget),
      rewardPaid: stats?.rewardsPaid ?? 0,
      avgCompletionSec: Math.round(Number(average[0]?.seconds ?? 0)),
    };
  }

  /** All of a merchant's campaigns together, each one, and day by day for the last `days` days. */
  async overview(merchantId: string, days: number, now: Date = new Date()): Promise<MerchantAnalyticsOverview> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { merchantId, deletedAt: null },
      select: { id: true, title: true, status: true, totalBudget: true, spentBudget: true },
    });
    const performance = await this.performanceService.forCampaigns(campaigns.map((campaign) => campaign.id));

    const rows = campaigns.map((campaign) => {
      const stats = performance.get(campaign.id);
      const completions = stats?.completions ?? 0;
      const rewardsPaid = stats?.rewardsPaid ?? 0;
      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        joins: stats?.joins ?? 0,
        finished: stats?.finished ?? 0,
        completionRate: stats?.completionRate ?? 0,
        completions,
        rewardsPaid,
        spentBudget: Number(campaign.spentBudget),
        totalBudget: Number(campaign.totalBudget),
        costPerCompletion: completions > 0 ? round2(rewardsPaid / completions) : null,
      };
    });

    const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
    const joins = sum((row) => row.joins);
    const finished = sum((row) => row.finished);
    const completions = sum((row) => row.completions);
    const rewardsPaid = sum((row) => row.rewardsPaid);

    const period = this.period(days, now);
    return {
      period: { days, from: period.days[0], to: period.days[period.days.length - 1] },
      totals: {
        campaigns: rows.length,
        activeCampaigns: rows.filter((row) => row.status === 'ACTIVE').length,
        joins,
        finished,
        completions,
        completionRate: joins > 0 ? Math.min(1, finished / joins) : 0,
        rewardsPaid: round2(rewardsPaid),
        budgetSpent: round2(sum((row) => row.spentBudget)),
        costPerCompletion: completions > 0 ? round2(rewardsPaid / completions) : null,
      },
      campaigns: [...rows].sort((a, b) => b.rewardsPaid - a.rewardsPaid || b.joins - a.joins).slice(0, CAMPAIGN_TABLE_LIMIT),
      daily: await this.daily(merchantId, period),
    };
  }

  /** The India days the period covers, oldest first, and the moment the first of them began. */
  private period(days: number, now: Date): { days: string[]; since: Date } {
    const istToday = new Date(now.getTime() + IST_OFFSET_MS);
    const todayStartUtcMs = Date.UTC(istToday.getUTCFullYear(), istToday.getUTCMonth(), istToday.getUTCDate());
    const labels = Array.from({ length: days }, (_, index) => new Date(todayStartUtcMs - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10));
    return { days: labels, since: new Date(todayStartUtcMs - (days - 1) * DAY_MS - IST_OFFSET_MS) };
  }

  private async daily(merchantId: string, period: { days: string[]; since: Date }) {
    const [joined, rewarded] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; joins: bigint }[]>`
        SELECT DATE(DATE_ADD(cp.joinedAt, INTERVAL ${IST_OFFSET_MINUTES} MINUTE)) AS day, COUNT(*) AS joins
        FROM campaign_participants cp
        JOIN campaigns c ON c.id = cp.campaignId
        WHERE c.merchantId = ${merchantId} AND cp.deletedAt IS NULL AND cp.status <> 'DISQUALIFIED' AND cp.joinedAt >= ${period.since}
        GROUP BY day`,
      // A reward reversed after fraud was found is not counted: the budget was given back.
      this.prisma.$queryRaw<{ day: Date; completions: bigint; amount: Prisma.Decimal | null }[]>`
        SELECT DATE(DATE_ADD(r.creditedAt, INTERVAL ${IST_OFFSET_MINUTES} MINUTE)) AS day, COUNT(*) AS completions, SUM(r.amount) AS amount
        FROM rewards r
        JOIN campaigns c ON c.id = r.campaignId
        WHERE c.merchantId = ${merchantId} AND r.deletedAt IS NULL AND r.status = 'CREDITED' AND r.creditedAt >= ${period.since}
        GROUP BY day`,
    ]);

    const label = (day: Date) => day.toISOString().slice(0, 10);
    const joinsByDay = new Map(joined.map((row) => [label(row.day), Number(row.joins)]));
    const rewardsByDay = new Map(rewarded.map((row) => [label(row.day), { completions: Number(row.completions), amount: Number(row.amount ?? 0) }]));

    return period.days.map((date) => ({
      date,
      joins: joinsByDay.get(date) ?? 0,
      completions: rewardsByDay.get(date)?.completions ?? 0,
      rewardsPaid: round2(rewardsByDay.get(date)?.amount ?? 0),
    }));
  }
}

const round2 = (value: number) => Math.round(value * 100) / 100;
