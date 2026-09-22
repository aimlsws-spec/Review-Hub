import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { BROADCAST_JOB_NAMES, BROADCAST_TICK_INTERVAL_MS, BROADCAST_TICK_JOB_ID } from '../constants';

import { BroadcastSchedulerService } from './broadcast-scheduler.service';

describe('BroadcastSchedulerService', () => {
  const mockQueue = { add: jest.fn() };

  it('registers a once-a-minute repeatable check with a fixed id, so restarting the app never stacks up duplicates', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BroadcastSchedulerService, { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: mockQueue }],
    }).compile();

    await module.get(BroadcastSchedulerService).onModuleInit();

    expect(mockQueue.add).toHaveBeenCalledWith(
      BROADCAST_JOB_NAMES.TICK,
      {},
      { repeat: { every: BROADCAST_TICK_INTERVAL_MS }, jobId: BROADCAST_TICK_JOB_ID },
    );
    expect(BROADCAST_TICK_INTERVAL_MS).toBe(60_000);
    expect(BROADCAST_TICK_JOB_ID).not.toContain(':');
  });
});
