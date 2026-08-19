import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { NotificationRepository } from './notification.repository';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<NotificationRepository>(NotificationRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should only return non-deleted notifications', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1' });

      await repository.findById('n1');
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', deletedAt: null } });
    });
  });

  describe('findByUser', () => {
    it('should filter to unread when unreadOnly is set', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      mockPrisma.notification.count.mockResolvedValue(1);

      await repository.findByUser({ userId: 'user-1', page: 1, limit: 20, unreadOnly: true });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', deletedAt: null, readAt: null } }),
      );
    });

    it('should not filter on readAt when unreadOnly is false', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUser({ userId: 'user-1', page: 1, limit: 20 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', deletedAt: null } }),
      );
    });
  });

  describe('countUnread', () => {
    it('should count notifications with no readAt', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await repository.countUnread('user-1');
      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null, deletedAt: null },
      });
    });
  });

  describe('markRead', () => {
    it('should set readAt and status READ', async () => {
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', status: 'READ' });

      await repository.markRead('n1');
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: expect.any(Date), status: 'READ' },
      });
    });
  });

  describe('markAllRead', () => {
    it('should bulk-update all unread notifications for a user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await repository.markAllRead('user-1');
      expect(result.count).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null, deletedAt: null },
        data: { readAt: expect.any(Date), status: 'READ' },
      });
    });
  });
});
