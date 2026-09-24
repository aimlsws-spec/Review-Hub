import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { AUTO_RECHARGE_CRON_PATTERN, AUTO_RECHARGE_JOB_NAME, AUTO_RECHARGE_REPEAT_JOB_ID } from '../constants';

import { AutoRechargeSchedulerService } from './auto-recharge-scheduler.service';

describe('AutoRechargeSchedulerService', () => {
  let service: AutoRechargeSchedulerService;

  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoRechargeSchedulerService,
        { provide: getQueueToken(QUEUE_NAMES.WALLET_AUTO_RECHARGE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<AutoRechargeSchedulerService>(AutoRechargeSchedulerService);
    jest.clearAllMocks();
  });

  it('should register the sweep as a fixed-id repeatable job on module init', async () => {
    await service.onModuleInit();

    expect(mockQueue.add).toHaveBeenCalledWith(
      AUTO_RECHARGE_JOB_NAME,
      {},
      { repeat: { pattern: AUTO_RECHARGE_CRON_PATTERN }, jobId: AUTO_RECHARGE_REPEAT_JOB_ID },
    );
  });
});
