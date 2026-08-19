import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';

import { NotificationQueueService } from './notification-queue.service';

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;

  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueueService,
        { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<NotificationQueueService>(NotificationQueueService);
    jest.clearAllMocks();
  });

  it('should add a "dispatch" job to the notifications queue', async () => {
    const payload = { userId: 'user-1', type: 'REWARD' as const, title: 'Hi', message: 'Body' };

    await service.enqueue(payload);

    expect(mockQueue.add).toHaveBeenCalledWith('dispatch', payload);
  });
});
