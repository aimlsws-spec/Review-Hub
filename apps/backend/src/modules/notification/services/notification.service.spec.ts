import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailQueueService } from '../../../mail/email-queue.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { NotificationPreferenceRepository, NotificationRepository } from '../repositories';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };
  const mockPreferenceRepository = {
    getOrCreate: jest.fn(),
    update: jest.fn(),
  };
  const mockUserRepository = { findByIdSimple: jest.fn() };
  const mockEmailQueueService = { enqueue: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockNotificationRepository },
        { provide: NotificationPreferenceRepository, useValue: mockPreferenceRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('dispatch', () => {
    const basePayload = { userId: 'user-1', type: 'REWARD' as const, title: 'Reward credited', message: '₹50 credited' };

    it('should default to IN_APP only when no channels are given', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: true, emailEnabled: true });
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.dispatch(basePayload);

      expect(result).toHaveLength(1);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'IN_APP', status: 'SENT' }),
      );
      expect(mockEmailQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should skip IN_APP when the user disabled that preference', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: false, emailEnabled: true });

      const result = await service.dispatch(basePayload);

      expect(result).toHaveLength(0);
      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });

    it('should create a QUEUED EMAIL notification and enqueue it when requested and enabled', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: false, emailEnabled: true });
      mockUserRepository.findByIdSimple.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-2' });

      const result = await service.dispatch({ ...basePayload, channels: ['EMAIL'] });

      expect(result).toHaveLength(1);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'EMAIL', status: 'QUEUED' }),
      );
      expect(mockEmailQueueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com', notificationId: 'notif-2' }),
      );
    });

    it('should skip EMAIL silently when the user has no email address', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: false, emailEnabled: true });
      mockUserRepository.findByIdSimple.mockResolvedValue({ id: 'user-1', email: null });

      const result = await service.dispatch({ ...basePayload, channels: ['EMAIL'] });

      expect(result).toHaveLength(0);
      expect(mockEmailQueueService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('should mark a notification read when it belongs to the caller', async () => {
      mockNotificationRepository.findById.mockResolvedValue({ id: 'notif-1', userId: 'user-1' });
      mockNotificationRepository.markRead.mockResolvedValue({ id: 'notif-1', status: 'READ' });

      await service.markRead('notif-1', 'user-1');
      expect(mockNotificationRepository.markRead).toHaveBeenCalledWith('notif-1');
    });

    it('should throw NotFoundException when the notification belongs to someone else', async () => {
      mockNotificationRepository.findById.mockResolvedValue({ id: 'notif-1', userId: 'other-user' });

      await expect(service.markRead('notif-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the notification does not exist', async () => {
      mockNotificationRepository.findById.mockResolvedValue(null);

      await expect(service.markRead('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePreferences', () => {
    it('should ensure a preference row exists before updating', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ userId: 'user-1' });
      mockPreferenceRepository.update.mockResolvedValue({ userId: 'user-1', emailEnabled: false });

      await service.updatePreferences('user-1', { emailEnabled: false });

      expect(mockPreferenceRepository.getOrCreate).toHaveBeenCalledWith('user-1');
      expect(mockPreferenceRepository.update).toHaveBeenCalledWith('user-1', { emailEnabled: false });
    });
  });
});
