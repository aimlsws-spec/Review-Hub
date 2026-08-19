import { Logger, Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { WalletModule } from '../modules/wallet/wallet.module';

import { EmailProcessor, NotificationProcessor, RewardProcessor } from './processors';

/** Hosts the BullMQ workers for the queues registered in QueueModule — the actual work, as opposed to the producers that enqueue it. */
@Module({
  imports: [MailModule, NotificationModule, WalletModule],
  providers: [EmailProcessor, NotificationProcessor, RewardProcessor],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor() {
    this.logger.log('JobsModule initialized');
  }
}
