import { Test, TestingModule } from '@nestjs/testing';

import { BROADCAST_JOB_NAMES } from '../../modules/notification/constants';
import { BroadcastFanOutService, NotificationService } from '../../modules/notification/services';

import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  const mockNotificationService = { dispatch: jest.fn() };
  const mockBroadcastFanOut = { run: jest.fn(), enqueueDue: jest.fn(), fail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: BroadcastFanOutService, useValue: mockBroadcastFanOut },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should hand the job payload to NotificationService.dispatch', async () => {
      const payload = { userId: 'user-1', type: 'REWARD' as const, title: 'Hi', message: 'Body' };
      mockNotificationService.dispatch.mockResolvedValue([]);

      await processor.process({ name: 'dispatch', data: payload } as never);

      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(payload);
      expect(mockBroadcastFanOut.run).not.toHaveBeenCalled();
    });

    it('still treats a job with any other name as a one-user notification', async () => {
      const payload = { userId: 'user-1', type: 'REWARD' as const, title: 'Hi', message: 'Body' };

      await processor.process({ name: undefined, data: payload } as never);

      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(payload);
    });

    it('expands a broadcast job into recipients', async () => {
      await processor.process({ name: BROADCAST_JOB_NAMES.FAN_OUT, data: { broadcastId: 'b1' } } as never);

      expect(mockBroadcastFanOut.run).toHaveBeenCalledWith('b1');
      expect(mockNotificationService.dispatch).not.toHaveBeenCalled();
    });

    it('starts due broadcasts on the schedule tick', async () => {
      await processor.process({ name: BROADCAST_JOB_NAMES.TICK, data: {} } as never);

      expect(mockBroadcastFanOut.enqueueDue).toHaveBeenCalled();
      expect(mockNotificationService.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    const fanOutJob = (attemptsMade: number, attempts = 3) =>
      ({ name: BROADCAST_JOB_NAMES.FAN_OUT, data: { broadcastId: 'b1' }, attemptsMade, opts: { attempts } }) as never;

    it('marks a broadcast failed once every retry has been used', async () => {
      await processor.onFailed(fanOutJob(3), new Error('redis down'));

      expect(mockBroadcastFanOut.fail).toHaveBeenCalledWith('b1', 'redis down');
    });

    it('does not give up while retries remain', async () => {
      await processor.onFailed(fanOutJob(1), new Error('blip'));

      expect(mockBroadcastFanOut.fail).not.toHaveBeenCalled();
    });

    it('treats a job with no retry setting as a single attempt', async () => {
      await processor.onFailed({ name: BROADCAST_JOB_NAMES.FAN_OUT, data: { broadcastId: 'b1' }, attemptsMade: 1, opts: {} } as never, new Error('x'));

      expect(mockBroadcastFanOut.fail).toHaveBeenCalledWith('b1', 'x');
    });

    it('ignores the failure of an ordinary one-user notification', async () => {
      await processor.onFailed({ name: 'dispatch', data: {}, attemptsMade: 3, opts: { attempts: 3 } } as never, new Error('smtp'));

      expect(mockBroadcastFanOut.fail).not.toHaveBeenCalled();
    });

    it('copes with a failure event that carries no job', async () => {
      await expect(processor.onFailed(undefined, new Error('orphan'))).resolves.toBeUndefined();
    });
  });
});
