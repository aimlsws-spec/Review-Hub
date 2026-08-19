import { Global, Module } from '@nestjs/common';

import { EmailQueueService } from './email-queue.service';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [MailService, EmailQueueService],
  exports: [MailService, EmailQueueService],
})
export class MailModule {}
