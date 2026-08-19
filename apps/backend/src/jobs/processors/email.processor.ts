import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmailJobData } from '../../mail/email-queue.service';
import { MailService } from '../../mail/mail.service';
import { NotificationRepository } from '../../modules/notification/repositories';
import { QUEUE_NAMES } from '../../queues/queue.constants';

/** Actually calls SMTP. Updates the source Notification row's status when the job was raised from one. */
@Processor(QUEUE_NAMES.EMAILS)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly notificationRepository: NotificationRepository,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { notificationId, ...mailOptions } = job.data;

    try {
      await this.mailService.send(mailOptions);
      if (notificationId) {
        await this.notificationRepository.update(notificationId, { status: 'SENT', sentAt: new Date() });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email delivery failed: ${message}`);
      if (notificationId) {
        await this.notificationRepository.update(notificationId, { status: 'FAILED', failedReason: message });
      }
      throw error;
    }
  }
}
