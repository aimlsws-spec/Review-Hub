import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { SETTLEMENT_CRON_PATTERN, SETTLEMENT_JOB_NAME, SETTLEMENT_REPEAT_JOB_ID } from '../constants';

/**
 * Registers the nightly settlement job as a BullMQ repeatable job. Re-adding
 * it with the same jobId on every app boot is a no-op, not a duplicate — this
 * is the only place that needs to run, no separate cron package required.
 */
@Injectable()
export class SettlementSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SettlementSchedulerService.name);

  constructor(@InjectQueue(QUEUE_NAMES.SETTLEMENT) private readonly settlementQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.settlementQueue.add(
      SETTLEMENT_JOB_NAME,
      {},
      { repeat: { pattern: SETTLEMENT_CRON_PATTERN }, jobId: SETTLEMENT_REPEAT_JOB_ID },
    );
    this.logger.log(`Scheduled nightly settlement job (${SETTLEMENT_CRON_PATTERN})`);
  }
}
