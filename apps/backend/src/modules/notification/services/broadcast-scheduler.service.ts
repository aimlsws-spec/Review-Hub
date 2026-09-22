import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { BROADCAST_JOB_NAMES, BROADCAST_TICK_INTERVAL_MS, BROADCAST_TICK_JOB_ID } from '../constants';

/**
 * Registers the once-a-minute check that starts due broadcasts, as a BullMQ repeatable job (the same
 * approach the nightly settlement uses, so no separate cron package is needed). The broadcast row in
 * the database is the source of truth: if Redis is ever wiped, the next tick still finds every
 * broadcast that is due, rather than a scheduled message vanishing with the queue.
 */
@Injectable()
export class BroadcastSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BroadcastSchedulerService.name);

  constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      BROADCAST_JOB_NAMES.TICK,
      {},
      { repeat: { every: BROADCAST_TICK_INTERVAL_MS }, jobId: BROADCAST_TICK_JOB_ID },
    );
    this.logger.log(`Scheduled broadcast check every ${BROADCAST_TICK_INTERVAL_MS / 1000}s`);
  }
}
