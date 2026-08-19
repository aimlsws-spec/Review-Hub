import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { SubmissionApprovedEvent } from '../../task/events';
import { RewardJobData } from '../interfaces';

/**
 * Reacts to the task module's approval event and hands it off to the
 * `rewards` queue instead of crediting the wallet inline — reward crediting
 * touches money, so it runs behind BullMQ's retry/backoff rather than on the
 * event-emitter's synchronous call stack. RewardProcessor does the actual work.
 */
@Injectable()
export class RewardListener {
  private readonly logger = new Logger(RewardListener.name);

  constructor(@InjectQueue(QUEUE_NAMES.REWARDS) private readonly rewardQueue: Queue<RewardJobData>) {}

  @OnEvent('task.submission.approved')
  async handleSubmissionApproved(event: SubmissionApprovedEvent) {
    await this.rewardQueue.add('credit', {
      submissionId: event.submissionId,
      taskId: event.taskId,
      campaignId: event.campaignId,
      userId: event.userId,
      rewardAmount: event.rewardAmount,
    });
    this.logger.log(`Queued reward for submission ${event.submissionId}`);
  }
}
