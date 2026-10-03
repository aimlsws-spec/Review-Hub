import { Logger, Module } from '@nestjs/common';

import { AppConfigModule } from '../app-config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MerchantModule } from '../merchant/merchant.module';
import { NotificationModule } from '../notification/notification.module';
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
  PublicCmsPageController,
  FaqController,
  FeatureFlagController,
  FraudFlagController,
  PlatformConfigurationController,
  SettingsController,
  UserManagementController,
  KycManagementController,
  AccountRiskController,
  CityController,
  AdminDashboardController,
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
  DashboardMetricsRepository,
  AdminDailySummaryRepository,
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
  AdminDashboardService,
  AdminDailySummaryService,
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
    NotificationModule,
  ],
  controllers: [
    AdminDisputeController,
    UserManagementController,
    AdminCampaignQueueController,
    AdminWithdrawalQueueController,
    FraudFlagController,
    CmsPageController,
    PublicCmsPageController,
    FaqController,
    SettingsController,
    FeatureFlagController,
    AuditLogController,
    AdminSupportTicketController,
    PlatformConfigurationController,
    KycManagementController,
    AccountRiskController,
    CityController,
    AdminDashboardController,
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
    AdminDashboardService,
    DashboardMetricsRepository,
    AdminDailySummaryService,
    AdminDailySummaryRepository,
  ],
  exports: [FraudFlagRepository, AdminDashboardService, AdminDailySummaryService],
})
export class AdminModule {
  private readonly logger = new Logger(AdminModule.name);

  constructor() {
    this.logger.log('AdminModule initialized');
  }
}
