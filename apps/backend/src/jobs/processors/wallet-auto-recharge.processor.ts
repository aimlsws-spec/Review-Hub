import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AutoRechargeService } from '../../modules/merchant/services';
import { QUEUE_NAMES } from '../../queues/queue.constants';

/** Runs the merchant wallet auto-recharge sweep triggered by AutoRechargeSchedulerService's repeatable job. */
@Processor(QUEUE_NAMES.WALLET_AUTO_RECHARGE)
export class WalletAutoRechargeProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletAutoRechargeProcessor.name);

  constructor(private readonly autoRechargeService: AutoRechargeService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Running wallet auto-recharge sweep (job ${job.name})`);
    await this.autoRechargeService.runSweep();
  }
}
