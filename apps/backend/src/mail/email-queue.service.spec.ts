import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../queues/queue.constants';

import { EmailQueueService } from './email-queue.service';

describe('EmailQueueService', () => {
  let service: EmailQueueService;

  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        { provide: getQueueToken(QUEUE_NAMES.EMAILS), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<EmailQueueService>(EmailQueueService);
    jest.clearAllMocks();
  });

  it('should add a "send" job to the emails queue', async () => {
    await service.enqueue({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(mockQueue.add).toHaveBeenCalledWith('send', {
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });
  });
});
