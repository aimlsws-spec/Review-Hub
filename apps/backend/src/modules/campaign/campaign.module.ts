import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';
import { NotificationModule } from '../notification/notification.module';

import {
  CampaignController,
  MerchantCampaignController,
  MerchantSuggestionController,
  PublicCampaignController,
  SavedCampaignController,
  UserCampaignController,
} from './controllers';
import { CampaignOwnershipGuard } from './guards';
import { CampaignRepository, MerchantSuggestionRepository, SavedCampaignRepository } from './repositories';
import {
  CampaignBuilderService,
  CampaignOptimizerService,
  CampaignPerformanceService,
  CampaignPolicyService,
  CampaignService,
  MerchantAnalyticsService,
  MerchantInsightsService,
  MerchantReportExportService,
  SavedCampaignService,
} from './services';

@Module({
  imports: [MerchantModule, NotificationModule],
  controllers: [
    MerchantCampaignController,
    CampaignController,
    PublicCampaignController,
    UserCampaignController,
    SavedCampaignController,
    MerchantSuggestionController,
  ],
  providers: [
    CampaignService,
    CampaignBuilderService,
    CampaignPerformanceService,
    CampaignPolicyService,
    MerchantAnalyticsService,
    MerchantInsightsService,
    MerchantReportExportService,
    SavedCampaignService,
    CampaignOptimizerService,
    CampaignRepository,
    SavedCampaignRepository,
    MerchantSuggestionRepository,
    CampaignOwnershipGuard,
  ],
  exports: [CampaignService, CampaignPolicyService, CampaignRepository, CampaignOwnershipGuard, CampaignOptimizerService, CampaignPerformanceService],
})
export class CampaignModule {
  private readonly logger = new Logger(CampaignModule.name);

  constructor() {
    this.logger.log('CampaignModule initialized');
  }
}
