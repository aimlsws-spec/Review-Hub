import { Logger, Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { MerchantModule } from '../modules/merchant/merchant.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { SettlementModule } from '../modules/settlement/settlement.module';
import { WalletModule } from '../modules/wallet/wallet.module';

import { EmailProcessor, NotificationProcessor, RewardProcessor, SettlementProcessor } from './processors';

/** Hosts the BullMQ workers for the queues registered in QueueModule — the actual work, as opposed to the producers that enqueue it. */
@Module({
  imports: [MailModule, NotificationModule, WalletModule, MerchantModule, SettlementModule],
  providers: [EmailProcessor, NotificationProcessor, RewardProcessor, SettlementProcessor],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor() {
    this.logger.log('JobsModule initialized');
  }
}
