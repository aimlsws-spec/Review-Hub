import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { CampaignPerformance } from '../interfaces';

/**
 * Works out how campaigns are doing from the records themselves: participants and credited rewards.
 *
 * WHY not the CampaignAnalytics table: nothing writes to it, so it is empty for every campaign. Counting from
 * the records that drive the money means the numbers are always the real ones.
 */
@Injectable()
export class CampaignPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** One entry per campaign id, including campaigns nobody has joined (all zeros). */
  async forCampaigns(campaignIds: string[]): Promise<Map<string, CampaignPerformance>> {
    const result = new Map<string, CampaignPerformance>(
      campaignIds.map((campaignId) => [campaignId, { campaignId, joins: 0, finished: 0, completionRate: 0, completions: 0, rewardsPaid: 0 }]),
    );
    if (!campaignIds.length) return result;

    const [joined, finished, rewards] = await Promise.all([
      // Someone disqualified for fraud is not counted against the merchant, so they are left out of the joins.
      this.prisma.campaignParticipant.groupBy({
        by: ['campaignId'],
        where: { campaignId: { in: campaignIds }, deletedAt: null, status: { not: 'DISQUALIFIED' } },
        _count: { _all: true },
      }),
      this.prisma.campaignParticipant.groupBy({
        by: ['campaignId'],
        where: { campaignId: { in: campaignIds }, deletedAt: null, status: { in: ['COMPLETED', 'REWARDED'] } },
        _count: { _all: true },
      }),
      // A reward that was reversed after fraud was found is not counted as paid: the budget was given back.
      this.prisma.reward.groupBy({
        by: ['campaignId'],
        where: { campaignId: { in: campaignIds }, deletedAt: null, status: 'CREDITED' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    for (const row of joined) this.entry(result, row.campaignId).joins = row._count._all;
    for (const row of finished) this.entry(result, row.campaignId).finished = row._count._all;
    for (const row of rewards) {
      const entry = this.entry(result, row.campaignId);
      entry.completions = row._count._all;
      entry.rewardsPaid = Number(row._sum.amount ?? 0);
    }
    for (const entry of result.values()) {
      entry.completionRate = entry.joins > 0 ? Math.min(1, entry.finished / entry.joins) : 0;
    }
    return result;
  }

  private entry(map: Map<string, CampaignPerformance>, campaignId: string): CampaignPerformance {
    let entry = map.get(campaignId);
    if (!entry) {
      entry = { campaignId, joins: 0, finished: 0, completionRate: 0, completions: 0, rewardsPaid: 0 };
      map.set(campaignId, entry);
    }
    return entry;
  }
}
