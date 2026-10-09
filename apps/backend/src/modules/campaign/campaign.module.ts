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
  AdminCampaignService,
  CampaignBuilderService,
  CampaignCoverService,
  CampaignOptimizerService,
  CampaignPerformanceService,
  CampaignPolicyService,
  CampaignScheduleService,
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
    AdminCampaignService,
    CampaignBuilderService,
    CampaignCoverService,
    CampaignPerformanceService,
    CampaignPolicyService,
    MerchantAnalyticsService,
    MerchantInsightsService,
    MerchantReportExportService,
    SavedCampaignService,
    CampaignOptimizerService,
    CampaignScheduleService,
    CampaignRepository,
    SavedCampaignRepository,
    MerchantSuggestionRepository,
    CampaignOwnershipGuard,
  ],
  exports: [CampaignService, AdminCampaignService, CampaignPolicyService, CampaignRepository, CampaignOwnershipGuard, CampaignOptimizerService, CampaignPerformanceService, CampaignScheduleService],
})
export class CampaignModule {
  private readonly logger = new Logger(CampaignModule.name);

  constructor() {
    this.logger.log('CampaignModule initialized');
  }
}
