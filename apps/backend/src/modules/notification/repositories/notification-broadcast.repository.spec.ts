import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { NotificationBroadcastRepository } from './notification-broadcast.repository';

describe('NotificationBroadcastRepository', () => {
  let repository: NotificationBroadcastRepository;

  const mockPrisma = {
    notificationBroadcast: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: { groupBy: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationBroadcastRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<NotificationBroadcastRepository>(NotificationBroadcastRepository);
    jest.clearAllMocks();
  });

  describe('findDueIds', () => {
    it('returns only scheduled, undeleted broadcasts whose time has come, oldest first', async () => {
      const now = new Date('2026-09-19T10:00:00Z');
      mockPrisma.notificationBroadcast.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);

      const ids = await repository.findDueIds(now, 20);

      expect(ids).toEqual(['b1', 'b2']);
      expect(mockPrisma.notificationBroadcast.findMany).toHaveBeenCalledWith({
        where: { status: 'SCHEDULED', scheduledAt: { lte: now }, deletedAt: null },
        orderBy: { scheduledAt: 'asc' },
        take: 20,
        select: { id: true },
      });
    });
  });

  describe('claimForSending', () => {
    it('wins the broadcast with a single conditional UPDATE and returns it', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notificationBroadcast.findFirst.mockResolvedValue({ id: 'b1', status: 'SENDING' });

      const claimed = await repository.claimForSending('b1');

      expect(claimed).toEqual({ id: 'b1', status: 'SENDING' });
      expect(mockPrisma.notificationBroadcast.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: 'SCHEDULED', deletedAt: null },
        data: { status: 'SENDING', startedAt: expect.any(Date) },
      });
    });

    it('lets an interrupted send resume: a broadcast already SENDING is handed back', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.notificationBroadcast.findFirst.mockResolvedValue({ id: 'b1', status: 'SENDING', cursorUserId: 'u9' });

      await expect(repository.claimForSending('b1')).resolves.toEqual(expect.objectContaining({ cursorUserId: 'u9' }));
    });

    it.each(['CANCELLED', 'SENT', 'FAILED'])('refuses a broadcast that is %s', async (status) => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.notificationBroadcast.findFirst.mockResolvedValue({ id: 'b1', status });

      await expect(repository.claimForSending('b1')).resolves.toBeNull();
    });

    it('returns null for a broadcast that does not exist', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.notificationBroadcast.findFirst.mockResolvedValue(null);

      await expect(repository.claimForSending('missing')).resolves.toBeNull();
    });
  });

  describe('cancelIfScheduled', () => {
    it('cancels a broadcast that has not started', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.cancelIfScheduled('b1')).resolves.toBe(true);
      expect(mockPrisma.notificationBroadcast.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: 'SCHEDULED', deletedAt: null },
        data: { status: 'CANCELLED', completedAt: expect.any(Date) },
      });
    });

    it('leaves a broadcast that already started alone', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.cancelIfScheduled('b1')).resolves.toBe(false);
    });
  });

  describe('markFailed', () => {
    it('only fails a broadcast that is still sending, and keeps the reason to a sane length', async () => {
      mockPrisma.notificationBroadcast.updateMany.mockResolvedValue({ count: 1 });

      await repository.markFailed('b1', 'x'.repeat(5000));

      const args = mockPrisma.notificationBroadcast.updateMany.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'b1', status: 'SENDING' });
      expect(args.data.status).toBe('FAILED');
      expect(args.data.failureReason).toHaveLength(1000);
    });
  });

  describe('saveProgress and markSent', () => {
    it('checkpoints the cursor and the running recipient count', async () => {
      await repository.saveProgress('b1', 'u500', 500);

      expect(mockPrisma.notificationBroadcast.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { cursorUserId: 'u500', recipientCount: 500 },
      });
    });

    it('marks a finished broadcast SENT with a completion time', async () => {
      await repository.markSent('b1');

      expect(mockPrisma.notificationBroadcast.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: 'SENT', completedAt: expect.any(Date) },
      });
    });
  });

  describe('list', () => {
    it('lists newest first, hiding deleted ones, optionally by status', async () => {
      mockPrisma.notificationBroadcast.findMany.mockResolvedValue([]);
      mockPrisma.notificationBroadcast.count.mockResolvedValue(0);

      await repository.list({ status: 'SENT', skip: 20, take: 10 });

      expect(mockPrisma.notificationBroadcast.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: 'SENT' }, skip: 20, take: 10, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('does not filter by status when none is given', async () => {
      mockPrisma.notificationBroadcast.findMany.mockResolvedValue([]);
      mockPrisma.notificationBroadcast.count.mockResolvedValue(0);

      await repository.list({ skip: 0, take: 10 });

      expect(mockPrisma.notificationBroadcast.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });
  });

  describe('deliveryBreakdown', () => {
    it('counts the messages a broadcast produced per channel and status', async () => {
      mockPrisma.notification.groupBy.mockResolvedValue([
        { channel: 'IN_APP', status: 'SENT', _count: { _all: 40 } },
        { channel: 'IN_APP', status: 'READ', _count: { _all: 10 } },
        { channel: 'EMAIL', status: 'FAILED', _count: { _all: 2 } },
      ]);

      const breakdown = await repository.deliveryBreakdown('b1');

      expect(breakdown).toEqual([
        { channel: 'IN_APP', status: 'SENT', count: 40 },
        { channel: 'IN_APP', status: 'READ', count: 10 },
        { channel: 'EMAIL', status: 'FAILED', count: 2 },
      ]);
      expect(mockPrisma.notification.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { broadcastId: 'b1' } }));
    });
  });
});
