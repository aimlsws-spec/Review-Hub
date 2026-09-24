import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { AUTO_RECHARGE_CRON_PATTERN, AUTO_RECHARGE_JOB_NAME, AUTO_RECHARGE_REPEAT_JOB_ID } from '../constants';

/**
 * Registers the auto-recharge sweep as a BullMQ repeatable job, every 15 minutes — frequent
 * enough that a campaign isn't blocked for long by an empty wallet, without hammering the payment
 * gateway. Re-adding it with the same jobId on every app boot is a no-op, not a duplicate — mirrors
 * SettlementSchedulerService's pattern for the (much less frequent) nightly settlement job.
 */
@Injectable()
export class AutoRechargeSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AutoRechargeSchedulerService.name);

  constructor(@InjectQueue(QUEUE_NAMES.WALLET_AUTO_RECHARGE) private readonly autoRechargeQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.autoRechargeQueue.add(
      AUTO_RECHARGE_JOB_NAME,
      {},
      { repeat: { pattern: AUTO_RECHARGE_CRON_PATTERN }, jobId: AUTO_RECHARGE_REPEAT_JOB_ID },
    );
    this.logger.log(`Scheduled wallet auto-recharge sweep (${AUTO_RECHARGE_CRON_PATTERN})`);
  }
}
