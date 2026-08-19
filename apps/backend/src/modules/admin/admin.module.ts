import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { SupportModule } from '../support/support.module';
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
  SettingsController,
  UserManagementController,
} from './controllers';
import {
  AuditLogRepository,
  CmsPageRepository,
  FaqRepository,
  FeatureFlagRepository,
  FraudFlagRepository,
  SystemSettingRepository,
  UserAdminRepository,
} from './repositories';
import {
  AuditLogViewerService,
  CmsPageService,
  FaqService,
  FeatureFlagService,
  FraudReviewService,
  SettingsService,
  UserManagementService,
} from './services';

@Module({
  imports: [AuthModule, CampaignModule, WalletModule, SupportModule],
  controllers: [
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
  ],
  providers: [
    UserManagementService,
    FraudReviewService,
    CmsPageService,
    FaqService,
    SettingsService,
    FeatureFlagService,
    AuditLogViewerService,
    UserAdminRepository,
    FraudFlagRepository,
    CmsPageRepository,
    FaqRepository,
    SystemSettingRepository,
    FeatureFlagRepository,
    AuditLogRepository,
  ],
})
export class AdminModule {
  private readonly logger = new Logger(AdminModule.name);

  constructor() {
    this.logger.log('AdminModule initialized');
  }
}
