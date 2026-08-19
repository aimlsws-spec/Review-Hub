import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { DispatchNotificationPayload } from '../interfaces';

@Injectable()
export class NotificationQueueService {
  constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly notificationQueue: Queue<DispatchNotificationPayload>) {}

  async enqueue(payload: DispatchNotificationPayload): Promise<void> {
    await this.notificationQueue.add('dispatch', payload);
  }
}
