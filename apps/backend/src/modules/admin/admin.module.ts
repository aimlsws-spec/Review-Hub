import { Logger, Module } from '@nestjs/common';

import { AppConfigModule } from '../app-config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MerchantModule } from '../merchant/merchant.module';
import { RiskModule } from '../risk/risk.module';
import { SupportModule } from '../support/support.module';
import { TaskModule } from '../task/task.module';
import { UserKycModule } from '../user-kyc/user-kyc.module';
import { WalletModule } from '../wallet/wallet.module';

import {
  AdminCampaignQueueController,
  AdminSupportTicketController,
  AdminWithdrawalQueueController,
  AuditLogController,
  CmsPageController,
  FaqController,
  FeatureFlagController,
  FraudFlagController,
  PlatformConfigurationController,
  SettingsController,
  UserManagementController,
  KycManagementController,
  AccountRiskController,
  CityController,
} from './controllers';
import { AdminDisputeController } from './controllers/admin-dispute.controller';
import {
  AuditLogRepository,
  CmsPageRepository,
  FaqRepository,
  FeatureFlagRepository,
  FraudFlagRepository,
  PlatformConfigurationRepository,
  SystemSettingRepository,
  UserAdminRepository,
  CityRepository,
} from './repositories';
import {
  AuditLogViewerService,
  CmsPageService,
  FaqService,
  FeatureFlagService,
  FraudReviewService,
  PlatformConfigurationService,
  SettingsService,
  UserManagementService,
  KycManagementService,
  CityService,
} from './services';

@Module({
  imports: [
    TaskModule,
    AppConfigModule,
    AuthModule,
    CampaignModule,
    MerchantModule,
    WalletModule,
    SupportModule,
    UserKycModule,
    RiskModule,
  ],
  controllers: [
    AdminDisputeController,
    UserManagementController,
    AdminCampaignQueueController,
    AdminWithdrawalQueueController,
    FraudFlagController,
    CmsPageController,
    FaqController,
    SettingsController,
    FeatureFlagController,
    AuditLogController,
    AdminSupportTicketController,
    PlatformConfigurationController,
    KycManagementController,
    AccountRiskController,
    CityController,
  ],
  providers: [
    UserManagementService,
    FraudReviewService,
    CmsPageService,
    FaqService,
    SettingsService,
    FeatureFlagService,
    AuditLogViewerService,
    PlatformConfigurationService,
    KycManagementService,
    CityService,
    UserAdminRepository,
    FraudFlagRepository,
    CmsPageRepository,
    FaqRepository,
    SystemSettingRepository,
    FeatureFlagRepository,
    AuditLogRepository,
    PlatformConfigurationRepository,
    CityRepository,
  ],
  exports: [FraudFlagRepository],
})
export class AdminModule {
  private readonly logger = new Logger(AdminModule.name);

  constructor() {
    this.logger.log('AdminModule initialized');
  }
}
