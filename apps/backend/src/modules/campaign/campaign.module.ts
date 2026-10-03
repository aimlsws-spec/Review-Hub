import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';

import { CampaignController, MerchantCampaignController, PublicCampaignController, SavedCampaignController, UserCampaignController } from './controllers';
import { CampaignOwnershipGuard } from './guards';
import { CampaignRepository, SavedCampaignRepository } from './repositories';
import {
  CampaignBuilderService,
  CampaignPerformanceService,
  CampaignPolicyService,
  CampaignService,
  MerchantAnalyticsService,
  MerchantInsightsService,
  MerchantReportExportService,
  SavedCampaignService,
} from './services';

@Module({
  imports: [MerchantModule],
  controllers: [MerchantCampaignController, CampaignController, PublicCampaignController, UserCampaignController, SavedCampaignController],
  providers: [CampaignService, CampaignBuilderService, CampaignPerformanceService, CampaignPolicyService, MerchantAnalyticsService, MerchantInsightsService, MerchantReportExportService, SavedCampaignService, CampaignRepository, SavedCampaignRepository, CampaignOwnershipGuard],
  exports: [CampaignService, CampaignPolicyService, CampaignRepository, CampaignOwnershipGuard],
})
export class CampaignModule {
  private readonly logger = new Logger(CampaignModule.name);

  constructor() {
    this.logger.log('CampaignModule initialized');
  }
}
