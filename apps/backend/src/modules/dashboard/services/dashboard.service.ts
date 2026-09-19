import { Injectable } from '@nestjs/common';

import { CampaignSort } from '@common/enums';

import { PublicCampaignQueryDto } from '../../campaign/dto/public-campaign-query.dto';
import { CampaignService } from '../../campaign/services/campaign.service';
import { TaskRecommendationService } from '../../task/services/task-recommendation.service';
import { WalletService } from '../../wallet/services/wallet.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly walletService: WalletService,
    private readonly campaignService: CampaignService,
    private readonly taskRecommendationService: TaskRecommendationService,
  ) {}

  async getHomeDashboard(userId: string) {
    const [wallet, featuredCampaigns, popularCampaigns, recommendedTasks] = await Promise.all([
      this.walletService.getWallet(userId),
      this.campaignService.listEligibleForUser(userId, this.buildFeedQuery(CampaignSort.Featured)),
      this.campaignService.listEligibleForUser(userId, this.buildFeedQuery(CampaignSort.Popular)),
      this.taskRecommendationService.getRecommended(userId),
    ]);

    return {
      wallet,
      featuredCampaigns: featuredCampaigns.data,
      popularCampaigns: popularCampaigns.data,
      recommendedTasks,
    };
  }

  /** Builds a real DTO instance so the DTO's defaults and getters (skip, sortOrder) apply, unlike a plain object literal. */
  private buildFeedQuery(sort: CampaignSort): PublicCampaignQueryDto {
    return Object.assign(new PublicCampaignQueryDto(), { page: 1, limit: 10, sort });
  }
}
