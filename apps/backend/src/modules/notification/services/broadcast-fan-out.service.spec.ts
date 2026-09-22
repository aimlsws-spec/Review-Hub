import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { BROADCAST_DUE_BATCH, BROADCAST_JOB_NAMES, BROADCAST_PAGE_SIZE } from '../constants';
import { BroadcastAudienceRepository, NotificationBroadcastRepository } from '../repositories';

import { BroadcastFanOutService } from './broadcast-fan-out.service';
import { SendTimeService } from './send-time.service';

describe('BroadcastFanOutService', () => {
  let service: BroadcastFanOutService;

  const mockQueue = { getJob: jest.fn(), add: jest.fn(), addBulk: jest.fn() };
  const mockBroadcastRepository = {
    findDueIds: jest.fn(),
    claimForSending: jest.fn(),
    saveProgress: jest.fn(),
    markSent: jest.fn(),
    markFailed: jest.fn(),
  };
  const mockAudienceRepository = { findPage: jest.fn() };
  const mockSendTimeService = { computeDelays: jest.fn() };

  const audience = { cityIds: ['c1'] };
  const broadcast = {
    id: 'b1',
    type: 'PROMOTIONAL',
    title: 'Happy hour, {{firstName}}!',
    message: 'Hi {{ firstName }}, tasks are live.',
    channels: ['IN_APP', 'PUSH'],
    audience,
    cursorUserId: null,
    recipientCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastFanOutService,
        { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: mockQueue },
        { provide: NotificationBroadcastRepository, useValue: mockBroadcastRepository },
        { provide: BroadcastAudienceRepository, useValue: mockAudienceRepository },
        { provide: SendTimeService, useValue: mockSendTimeService },
      ],
    }).compile();

    service = module.get<BroadcastFanOutService>(BroadcastFanOutService);
    jest.clearAllMocks();
    mockQueue.getJob.mockResolvedValue(undefined);
  });

  describe('run', () => {
    it('queues one personalised dispatch job per recipient, page by page, then marks the broadcast sent', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage
        .mockResolvedValueOnce([
          { id: 'u1', firstName: 'Priya' },
          { id: 'u2', firstName: 'Arjun' },
        ])
        .mockResolvedValueOnce([{ id: 'u3', firstName: 'Meera' }])
        .mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockQueue.addBulk).toHaveBeenCalledTimes(2);
      expect(mockQueue.addBulk.mock.calls[0][0]).toEqual([
        {
          name: 'dispatch',
          data: {
            userId: 'u1',
            type: 'PROMOTIONAL',
            title: 'Happy hour, Priya!',
            message: 'Hi Priya, tasks are live.',
            channels: ['IN_APP', 'PUSH'],
            broadcastId: 'b1',
            data: { broadcastId: 'b1' },
          },
          opts: { jobId: 'broadcast-b1-u1' },
        },
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u2', title: 'Happy hour, Arjun!' }) }),
      ]);
      expect(mockBroadcastRepository.markSent).toHaveBeenCalledWith('b1');
    });

    it('checkpoints the cursor and running total after every page', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage
        .mockResolvedValueOnce([{ id: 'u1', firstName: 'A' }, { id: 'u2', firstName: 'B' }])
        .mockResolvedValueOnce([{ id: 'u3', firstName: 'C' }])
        .mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockBroadcastRepository.saveProgress).toHaveBeenNthCalledWith(1, 'b1', 'u2', 2);
      expect(mockBroadcastRepository.saveProgress).toHaveBeenNthCalledWith(2, 'b1', 'u3', 3);
      expect(mockAudienceRepository.findPage).toHaveBeenNthCalledWith(1, audience, null, BROADCAST_PAGE_SIZE);
      expect(mockAudienceRepository.findPage).toHaveBeenNthCalledWith(2, audience, 'u2', BROADCAST_PAGE_SIZE);
    });

    it('resumes an interrupted send from its checkpoint instead of starting over', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue({ ...broadcast, cursorUserId: 'u500', recipientCount: 500 });
      mockAudienceRepository.findPage.mockResolvedValueOnce([{ id: 'u501', firstName: 'Late' }]).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockAudienceRepository.findPage).toHaveBeenNthCalledWith(1, audience, 'u500', BROADCAST_PAGE_SIZE);
      expect(mockBroadcastRepository.saveProgress).toHaveBeenCalledWith('b1', 'u501', 501);
    });

    it('gives every recipient a fixed job id, so a page queued twice still yields one message', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage.mockResolvedValueOnce([{ id: 'u1', firstName: 'A' }]).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockQueue.addBulk.mock.calls[0][0][0].opts.jobId).toBe('broadcast-b1-u1');
      expect(mockQueue.addBulk.mock.calls[0][0][0].opts.jobId).not.toContain(':');
    });

    it.each([
      ['a blank name', '   ', 'Happy hour, there!'],
      ['a missing-looking name', '', 'Happy hour, there!'],
    ])('says "there" for %s rather than leaving a hole in the message', async (_label, firstName, expectedTitle) => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage.mockResolvedValueOnce([{ id: 'u1', firstName }]).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockQueue.addBulk.mock.calls[0][0][0].data.title).toBe(expectedTitle);
    });

    it('caps a very long name so it cannot bloat a push notification', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage.mockResolvedValueOnce([{ id: 'u1', firstName: 'A'.repeat(500) }]).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockQueue.addBulk.mock.calls[0][0][0].data.title).toBe(`Happy hour, ${'A'.repeat(50)}!`);
    });

    it('does nothing for a broadcast that was cancelled, finished or never existed', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(null);

      await service.run('b1');

      expect(mockAudienceRepository.findPage).not.toHaveBeenCalled();
      expect(mockQueue.addBulk).not.toHaveBeenCalled();
      expect(mockBroadcastRepository.markSent).not.toHaveBeenCalled();
    });

    it('marks an audience that has since become empty as sent, with nothing queued', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage.mockResolvedValue([]);

      await service.run('b1');

      expect(mockQueue.addBulk).not.toHaveBeenCalled();
      expect(mockBroadcastRepository.markSent).toHaveBeenCalledWith('b1');
    });

    it('lets a queue failure propagate and never claims success, so the job is retried', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(broadcast);
      mockAudienceRepository.findPage.mockResolvedValueOnce([{ id: 'u1', firstName: 'A' }]);
      mockQueue.addBulk.mockRejectedValue(new Error('redis down'));

      await expect(service.run('b1')).rejects.toThrow('redis down');

      expect(mockBroadcastRepository.saveProgress).not.toHaveBeenCalled();
      expect(mockBroadcastRepository.markSent).not.toHaveBeenCalled();
    });
  });

  describe('run — smart timing', () => {
    const smart = { ...broadcast, smartTiming: true };
    const users = [{ id: 'u1', firstName: 'A' }, { id: 'u2', firstName: 'B' }];

    beforeEach(() => {
      // clearAllMocks keeps queued once-values from earlier tests; these tests need a clean slate.
      mockAudienceRepository.findPage.mockReset();
      mockQueue.addBulk.mockReset();
      mockSendTimeService.computeDelays.mockReset();
      mockSendTimeService.computeDelays.mockResolvedValue(new Map([['u1', 3_600_000], ['u2', 7_200_000]]));
    });

    it('holds each recipient message for their own delay, keeping the fixed job id', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(smart);
      mockAudienceRepository.findPage.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockSendTimeService.computeDelays).toHaveBeenCalledWith(['u1', 'u2']);
      const jobs = mockQueue.addBulk.mock.calls[0][0];
      expect(jobs[0].opts).toEqual({ jobId: 'broadcast-b1-u1', delay: 3_600_000 });
      expect(jobs[1].opts).toEqual({ jobId: 'broadcast-b1-u2', delay: 7_200_000 });
    });

    it('asks for delays one page at a time', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(smart);
      mockAudienceRepository.findPage.mockResolvedValueOnce([users[0]]).mockResolvedValueOnce([users[1]]).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockSendTimeService.computeDelays).toHaveBeenCalledTimes(2);
      expect(mockSendTimeService.computeDelays).toHaveBeenNthCalledWith(1, ['u1']);
      expect(mockSendTimeService.computeDelays).toHaveBeenNthCalledWith(2, ['u2']);
    });

    it('sends straight away, with no delay at all, when smart timing is off', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue({ ...broadcast, smartTiming: false });
      mockAudienceRepository.findPage.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockSendTimeService.computeDelays).not.toHaveBeenCalled();
      expect(mockQueue.addBulk.mock.calls[0][0][0].opts).toEqual({ jobId: 'broadcast-b1-u1' });
      expect(mockQueue.addBulk.mock.calls[0][0][0].opts).not.toHaveProperty('delay');
    });

    it('never delays a system announcement, even if it was saved with smart timing', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue({ ...smart, type: 'SYSTEM' });
      mockAudienceRepository.findPage.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockSendTimeService.computeDelays).not.toHaveBeenCalled();
      expect(mockQueue.addBulk.mock.calls[0][0][0].opts).not.toHaveProperty('delay');
    });

    it('still checkpoints and finishes the broadcast', async () => {
      mockBroadcastRepository.claimForSending.mockResolvedValue(smart);
      mockAudienceRepository.findPage.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      await service.run('b1');

      expect(mockBroadcastRepository.saveProgress).toHaveBeenCalledWith('b1', 'u2', 2);
      expect(mockBroadcastRepository.markSent).toHaveBeenCalledWith('b1');
    });
  });

  describe('enqueue', () => {
    it('queues a fan-out job with a fixed id, so the same broadcast is never started twice at once', async () => {
      await service.enqueue('b1');

      expect(mockQueue.add).toHaveBeenCalledWith(BROADCAST_JOB_NAMES.FAN_OUT, { broadcastId: 'b1' }, { jobId: 'broadcast-fan-out-b1' });
    });

    it('clears a failed earlier job with the same id, which would otherwise silently block the new one', async () => {
      const failedJob = { isFailed: jest.fn().mockResolvedValue(true), remove: jest.fn() };
      mockQueue.getJob.mockResolvedValue(failedJob);

      await service.enqueue('b1');

      expect(failedJob.remove).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('leaves a healthy job alone', async () => {
      const activeJob = { isFailed: jest.fn().mockResolvedValue(false), remove: jest.fn() };
      mockQueue.getJob.mockResolvedValue(activeJob);

      await service.enqueue('b1');

      expect(activeJob.remove).not.toHaveBeenCalled();
    });
  });

  describe('enqueueDue', () => {
    it('starts every due broadcast and reports how many', async () => {
      const now = new Date('2026-09-19T10:00:00Z');
      mockBroadcastRepository.findDueIds.mockResolvedValue(['b1', 'b2']);

      const started = await service.enqueueDue(now);

      expect(started).toBe(2);
      expect(mockBroadcastRepository.findDueIds).toHaveBeenCalledWith(now, BROADCAST_DUE_BATCH);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('does nothing when nothing is due', async () => {
      mockBroadcastRepository.findDueIds.mockResolvedValue([]);

      await expect(service.enqueueDue()).resolves.toBe(0);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('fail', () => {
    it('records why the broadcast failed', async () => {
      await service.fail('b1', 'boom');

      expect(mockBroadcastRepository.markFailed).toHaveBeenCalledWith('b1', 'boom');
    });
  });
});
