import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { DispatchNotificationPayload } from '../../modules/notification/interfaces';
import { NotificationService } from '../../modules/notification/services';
import { QUEUE_NAMES } from '../../queues/queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<DispatchNotificationPayload>): Promise<void> {
    await this.notificationService.dispatch(job.data);
    this.logger.log(`Dispatched ${job.data.type} notification to user ${job.data.userId}`);
  }
}
