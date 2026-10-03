import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';
import { NotificationModule } from '../notification/notification.module';
import { SettlementModule } from '../settlement/settlement.module';

import { AdminSubscriptionPlanController, MerchantSubscriptionController } from './controllers';
import { MerchantSubscriptionRepository, SubscriptionPlanRepository } from './repositories';
import { MerchantSubscriptionService, SubscriptionPlanAdminService } from './services';

/** Merchant subscription plans and paid featured campaigns, charged to the merchant wallet with GST invoices. */
@Module({
  imports: [AuthModule, MerchantModule, NotificationModule, SettlementModule],
  controllers: [AdminSubscriptionPlanController, MerchantSubscriptionController],
  providers: [MerchantSubscriptionService, SubscriptionPlanAdminService, MerchantSubscriptionRepository, SubscriptionPlanRepository],
  exports: [MerchantSubscriptionService],
})
export class SubscriptionModule {
  private readonly logger = new Logger(SubscriptionModule.name);

  constructor() {
    this.logger.log('SubscriptionModule initialized');
  }
}
