import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';

import { CampaignController, MerchantCampaignController, PublicCampaignController, UserCampaignController } from './controllers';
import { CampaignOwnershipGuard } from './guards';
import { CampaignRepository } from './repositories';
import {
  CampaignBuilderService,
  CampaignPerformanceService,
  CampaignPolicyService,
  CampaignService,
  MerchantAnalyticsService,
  MerchantInsightsService,
} from './services';

@Module({
  imports: [MerchantModule],
  controllers: [MerchantCampaignController, CampaignController, PublicCampaignController, UserCampaignController],
  providers: [CampaignService, CampaignBuilderService, CampaignPerformanceService, CampaignPolicyService, MerchantAnalyticsService, MerchantInsightsService, CampaignRepository, CampaignOwnershipGuard],
  exports: [CampaignService, CampaignPolicyService, CampaignRepository, CampaignOwnershipGuard],
})
export class CampaignModule {
  private readonly logger = new Logger(CampaignModule.name);

  constructor() {
    this.logger.log('CampaignModule initialized');
  }
}
