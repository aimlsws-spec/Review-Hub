import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { SETTLEMENT_CRON_PATTERN, SETTLEMENT_JOB_NAME, SETTLEMENT_REPEAT_JOB_ID } from '../constants';

import { SettlementSchedulerService } from './settlement-scheduler.service';

describe('SettlementSchedulerService', () => {
  let service: SettlementSchedulerService;

  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementSchedulerService,
        { provide: getQueueToken(QUEUE_NAMES.SETTLEMENT), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<SettlementSchedulerService>(SettlementSchedulerService);
    jest.clearAllMocks();
  });

  it('should register the nightly settlement job as a fixed-id repeatable job on module init', async () => {
    await service.onModuleInit();

    expect(mockQueue.add).toHaveBeenCalledWith(
      SETTLEMENT_JOB_NAME,
      {},
      { repeat: { pattern: SETTLEMENT_CRON_PATTERN }, jobId: SETTLEMENT_REPEAT_JOB_ID },
    );
  });
});
