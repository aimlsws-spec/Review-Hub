import { Logger, Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { AiModule } from '../modules/ai/ai.module';
import { MerchantModule } from '../modules/merchant/merchant.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { SettlementModule } from '../modules/settlement/settlement.module';
import { TaskModule } from '../modules/task/task.module';
import { WalletModule } from '../modules/wallet/wallet.module';

import { AiVerificationProcessor, EmailProcessor, NotificationProcessor, RewardProcessor, SettlementProcessor } from './processors';


/** Hosts the BullMQ workers for the queues registered in QueueModule — the actual work, as opposed to the producers that enqueue it. */
@Module({
  imports: [MailModule, NotificationModule, WalletModule, MerchantModule, SettlementModule, AiModule, TaskModule],
  providers: [EmailProcessor, NotificationProcessor, RewardProcessor, SettlementProcessor, AiVerificationProcessor],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor() {
    this.logger.log('JobsModule initialized');
  }
}
