import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { BROADCAST_JOB_NAMES } from '../../modules/notification/constants';
import { BroadcastFanOutJobData, DispatchNotificationPayload } from '../../modules/notification/interfaces';
import { BroadcastFanOutService, NotificationService } from '../../modules/notification/services';
import { QUEUE_NAMES } from '../../queues/queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly broadcastFanOut: BroadcastFanOutService,
  ) {
    super();
  }

  /** The queue carries three kinds of job: a broadcast to expand, the schedule check, and (by default) one user's notification. */
  async process(job: Job<DispatchNotificationPayload | BroadcastFanOutJobData>): Promise<void> {
    switch (job.name) {
      case BROADCAST_JOB_NAMES.FAN_OUT:
        await this.broadcastFanOut.run((job.data as BroadcastFanOutJobData).broadcastId);
        return;
      case BROADCAST_JOB_NAMES.TICK:
        await this.broadcastFanOut.enqueueDue();
        return;
      default: {
        const payload = job.data as DispatchNotificationPayload;
        await this.notificationService.dispatch(payload);
        this.logger.log(`Dispatched ${payload.type} notification to user ${payload.userId}`);
      }
    }
  }

  /** Once BullMQ has used up every retry on a broadcast, mark it FAILED instead of leaving it looking like it is still sending. */
  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (job?.name !== BROADCAST_JOB_NAMES.FAN_OUT) return;
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return;
    await this.broadcastFanOut.fail((job.data as BroadcastFanOutJobData).broadcastId, error.message);
  }
}
