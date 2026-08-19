import { Test, TestingModule } from '@nestjs/testing';

import { NotificationService } from '../../modules/notification/services';

import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  const mockNotificationService = { dispatch: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    jest.clearAllMocks();
  });

  it('should hand the job payload to NotificationService.dispatch', async () => {
    const payload = { userId: 'user-1', type: 'REWARD' as const, title: 'Hi', message: 'Body' };
    mockNotificationService.dispatch.mockResolvedValue([]);

    await processor.process({ data: payload } as never);

    expect(mockNotificationService.dispatch).toHaveBeenCalledWith(payload);
  });
});
