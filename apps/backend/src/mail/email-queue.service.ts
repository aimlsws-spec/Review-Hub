import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../queues/queue.constants';

import { SendMailOptions } from './mail.service';

export interface EmailJobData extends SendMailOptions {
  /** When set, EmailProcessor updates this Notification row's status after attempting delivery. */
  notificationId?: string;
}

/**
 * The only way the rest of the app should send email. Puts the SMTP call
 * behind the `emails` queue instead of on the request/event-handling path,
 * so a slow or failing mail server can't block whatever triggered it and
 * gets BullMQ's retry/backoff for free.
 */
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(QUEUE_NAMES.EMAILS) private readonly emailQueue: Queue<EmailJobData>) {}

  async enqueue(data: EmailJobData): Promise<void> {
    await this.emailQueue.add('send', data);
  }
}
