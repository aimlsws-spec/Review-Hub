import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { getIstDayBoundaries, istDayKey } from '@common/utils';

import { NotificationQueueService } from '../../notification/services';
import { AdminDailySummaryRepository } from '../repositories/admin-daily-summary.repository';

import { AdminDashboardService } from './admin-dashboard.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_CAMPAIGNS = 5;

/** Yesterday's figures, as stored with the summary. */
export interface DailySummaryFigures {
  newUsers: number;
  campaignsCreated: number;
  activeCampaigns: number;
  tasksApproved: number;
  rewardsCredited: number;
  rewardsAmount: number;
  commission: number;
  withdrawalsRequested: number;
  withdrawalsPaid: number;
  fraudFlags: number;
  topCampaigns: Array<{ title: string; completions: number }>;
}

const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** The summary text, from figures only. Deterministic: the same day always reads the same. */
export function summaryText(day: string, f: DailySummaryFigures): string {
  const lines = [
    `Platform summary for ${day} (India time).`,
    `People: ${f.newUsers} signed up.`,
    `Tasks: ${f.tasksApproved} approved; ${f.rewardsCredited} rewards credited worth ${rupees(f.rewardsAmount)}.`,
    `Campaigns: ${f.campaignsCreated} created; ${f.activeCampaigns} running now.`,
    `Money: ${rupees(f.commission)} commission; withdrawals ${rupees(f.withdrawalsRequested)} asked for, ${rupees(f.withdrawalsPaid)} paid.`,
    `Fraud: ${f.fraudFlags} flag${f.fraudFlags === 1 ? '' : 's'} raised.`,
  ];
  if (f.topCampaigns.length > 0) {
    lines.push(`Busiest campaigns: ${f.topCampaigns.map((c) => `${c.title} (${c.completions})`).join(', ')}.`);
  }
  return lines.join('\n');
}

/**
 * The daily admin summary (platform job daily-admin-summary, 08:00 IST): yesterday's figures from the same queries as
 * the dashboard charts, written as a short text, stored, and sent to super admins and admins by email and in the
 * app. Written from a template: the AI service has no summarising endpoint, and these figures need no interpretation.
 * Runs once per day: a second run for the same day changes nothing.
 */
@Injectable()
export class AdminDailySummaryService {
  private readonly logger = new Logger(AdminDailySummaryService.name);

  constructor(
    private readonly repository: AdminDailySummaryRepository,
    private readonly dashboardService: AdminDashboardService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  async buildForYesterday(now: Date = new Date()): Promise<{ day: string; created: boolean; recipients: number }> {
    const end = getIstDayBoundaries(now).start;
    const start = new Date(end.getTime() - DAY_MS);
    const day = istDayKey(start);

    if (await this.repository.findByDay(day)) return { day, created: false, recipients: 0 };

    const [series, activity, topCampaigns] = await Promise.all([
      this.dashboardService.seriesBetween(start, end),
      this.repository.activityBetween(start, end),
      this.repository.topCampaignsBetween(start, end, TOP_CAMPAIGNS),
    ]);
    const figures: DailySummaryFigures = {
      newUsers: series.totals.newUsers,
      campaignsCreated: series.totals.campaignsCreated,
      activeCampaigns: series.activeCampaigns,
      tasksApproved: activity.tasksApproved,
      rewardsCredited: activity.rewardsCredited,
      rewardsAmount: activity.rewardsAmount,
      commission: series.totals.commission,
      withdrawalsRequested: series.totals.withdrawalsRequested,
      withdrawalsPaid: series.totals.withdrawalsPaid,
      fraudFlags: series.totals.fraudFlags,
      topCampaigns,
    };
    const text = summaryText(day, figures);
    await this.repository.create(day, text, figures as unknown as Prisma.InputJsonValue);

    const recipients = await this.repository.findRecipientIds();
    for (const userId of recipients) {
      await this.notificationQueue.enqueue({ userId, type: 'SYSTEM', title: `Platform summary for ${day}`, message: text, channels: ['IN_APP', 'EMAIL'] });
    }
    this.logger.log(`Daily admin summary for ${day} sent to ${recipients.length} admin(s)`);
    return { day, created: true, recipients: recipients.length };
  }

  async getLatest() {
    return this.repository.findLatest();
  }
}
