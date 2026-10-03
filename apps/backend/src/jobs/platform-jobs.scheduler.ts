import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../queues/queue.constants';

import { PLATFORM_JOB_TIMEZONE, PLATFORM_JOBS } from './platform-jobs.constants';

/**
 * Registers every platform job as a BullMQ repeatable job, in India time. Re-adding one with the same jobId on each
 * boot is a no-op, as with the settlement job, so no separate cron package is needed.
 */
@Injectable()
export class PlatformJobsScheduler implements OnModuleInit {
  private readonly logger = new Logger(PlatformJobsScheduler.name);

  constructor(@InjectQueue(QUEUE_NAMES.PLATFORM_JOBS) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    for (const job of Object.values(PLATFORM_JOBS)) {
      await this.queue.add(
        job.jobName,
        {},
        { repeat: { pattern: job.cronExpression, tz: PLATFORM_JOB_TIMEZONE }, jobId: `repeat:${job.jobName}` },
      );
    }
    this.logger.log(`Scheduled ${Object.keys(PLATFORM_JOBS).length} platform jobs (${PLATFORM_JOB_TIMEZONE})`);
  }
}
