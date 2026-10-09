import { Injectable } from '@nestjs/common';

import { AdminCampaignQueryDto } from '../dto';
import { CampaignRepository } from '../repositories/campaign.repository';

import { CampaignPerformanceService } from './campaign-performance.service';
import { CampaignService } from './campaign.service';

/**
 * The admin's view of every campaign on the platform, whatever its status: the moderation queue only holds campaigns
 * waiting for a decision, so without this an approved campaign disappeared from the admin's sight.
 *
 * Performance numbers come from CampaignPerformanceService (counted from participants and credited rewards), never
 * the CampaignAnalytics table, which nothing writes to.
 */
@Injectable()
export class AdminCampaignService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignService: CampaignService,
    private readonly performanceService: CampaignPerformanceService,
  ) {}

  /** One page of campaigns matching the filters, each with how it is doing, plus how many campaigns each status holds. */
  async list(query: AdminCampaignQueryDto) {
    const result = await this.campaignRepository.findForAdmin({
      page: query.page,
      limit: query.limit,
      status: query.status,
      campaignType: query.campaignType,
      merchantId: query.merchantId,
      search: query.search || undefined,
    });
    const performance = await this.performanceService.forCampaigns(result.data.map((campaign) => campaign.id));
    return {
      ...result,
      data: result.data.map((campaign) => ({ ...campaign, performance: performance.get(campaign.id) })),
    };
  }

  /** One campaign in full (as the moderation view shows it) with how it is doing so far. */
  async getDetail(campaignId: string) {
    const campaign = await this.campaignService.getAdminDetail(campaignId);
    const performance = await this.performanceService.forCampaigns([campaign.id]);
    return { ...campaign, performance: performance.get(campaign.id) };
  }
}
