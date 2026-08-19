import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface MerchantCampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  spentBudget: number;
  totalParticipants: number;
}

/**
 * Read-only aggregate stats over the Campaign entity, scoped to a merchant.
 *
 * The Campaign entity itself is owned by CampaignModule/CampaignRepository.
 * This repository intentionally stays narrow (aggregate reads only, no
 * writes) so the merchant dashboard doesn't need a circular dependency on
 * CampaignModule (which already depends on MerchantModule).
 */
@Injectable()
export class MerchantCampaignStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(merchantId: string): Promise<MerchantCampaignStats> {
    const [totalCampaigns, activeCampaigns, budgetTotals] = await Promise.all([
      this.prisma.campaign.count({ where: { merchantId, deletedAt: null } }),
      this.prisma.campaign.count({ where: { merchantId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.campaign.aggregate({
        where: { merchantId, deletedAt: null },
        _sum: { totalBudget: true, spentBudget: true, currentParticipants: true },
      }),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalBudget: Number(budgetTotals._sum.totalBudget ?? 0),
      spentBudget: Number(budgetTotals._sum.spentBudget ?? 0),
      totalParticipants: budgetTotals._sum.currentParticipants ?? 0,
    };
  }
}
