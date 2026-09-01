import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { SettlementService } from '../../modules/settlement/services';
import { QUEUE_NAMES } from '../../queues/queue.constants';

/** Runs the nightly settlement generation triggered by SettlementSchedulerService's repeatable job. */
@Processor(QUEUE_NAMES.SETTLEMENT)
export class SettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(SettlementProcessor.name);

  constructor(private readonly settlementService: SettlementService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Running settlement job ${job.name}`);
    await this.settlementService.generateForPreviousDay();
  }
}
