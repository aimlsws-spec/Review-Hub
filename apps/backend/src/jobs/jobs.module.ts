import { Logger, Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { AiModule } from '../modules/ai/ai.module';
import { GamificationModule } from '../modules/gamification/gamification.module';
import { MerchantModule } from '../modules/merchant/merchant.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { ScheduledJobsModule } from '../modules/scheduled-jobs/scheduled-jobs.module';
import { SettlementModule } from '../modules/settlement/settlement.module';
import { SubscriptionModule } from '../modules/subscription/subscription.module';
import { TaskModule } from '../modules/task/task.module';
import { WalletModule } from '../modules/wallet/wallet.module';

import { PlatformJobsScheduler } from './platform-jobs.scheduler';
import {
  AiVerificationProcessor,
  EmailProcessor,
  NotificationProcessor,
  PlatformJobsProcessor,
  RewardProcessor,
  SettlementProcessor,
  WalletAutoRechargeProcessor,
} from './processors';

/** Hosts the BullMQ workers for the queues registered in QueueModule — the actual work, as opposed to the producers that enqueue it. */
@Module({
  imports: [
    MailModule,
    NotificationModule,
    WalletModule,
    MerchantModule,
    SettlementModule,
    AiModule,
    TaskModule,
    GamificationModule,
    ScheduledJobsModule,
    SubscriptionModule,
  ],
  providers: [
    EmailProcessor,
    NotificationProcessor,
    RewardProcessor,
    SettlementProcessor,
    AiVerificationProcessor,
    WalletAutoRechargeProcessor,
    PlatformJobsProcessor,
    PlatformJobsScheduler,
  ],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor() {
    this.logger.log('JobsModule initialized');
  }
}
