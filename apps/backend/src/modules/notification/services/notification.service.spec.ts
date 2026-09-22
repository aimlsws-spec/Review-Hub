import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { EmailQueueService } from '../../../mail/email-queue.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { UserRepository } from '../../auth/repositories/user.repository';
import { NotificationPreferenceRepository, NotificationRepository } from '../repositories';

import { NotificationService } from './notification.service';
import { PushService } from './push.service';

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
  const mockDeviceRepository = { findByUserId: jest.fn() };
  const mockPushService = { sendToTokens: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockNotificationRepository },
        { provide: NotificationPreferenceRepository, useValue: mockPreferenceRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: DeviceRepository, useValue: mockDeviceRepository },
        { provide: PushService, useValue: mockPushService },
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

    it('should create a SENT PUSH notification and send it when the user has registered devices', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: false, emailEnabled: false, pushEnabled: true });
      mockDeviceRepository.findByUserId.mockResolvedValue([
        { id: 'device-1', pushToken: 'token-1' },
        { id: 'device-2', pushToken: null },
      ]);
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-3' });

      const result = await service.dispatch({ ...basePayload, channels: ['PUSH'] });

      expect(result).toHaveLength(1);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'PUSH', status: 'SENT' }),
      );
      expect(mockPushService.sendToTokens).toHaveBeenCalledWith(
        ['token-1'],
        expect.objectContaining({
          title: basePayload.title,
          body: basePayload.message,
          data: expect.objectContaining({ type: basePayload.type }),
        }),
      );
    });

    it('should skip PUSH silently when the user has no registered device tokens', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ inAppEnabled: false, emailEnabled: false, pushEnabled: true });
      mockDeviceRepository.findByUserId.mockResolvedValue([]);

      const result = await service.dispatch({ ...basePayload, channels: ['PUSH'] });

      expect(result).toHaveLength(0);
      expect(mockPushService.sendToTokens).not.toHaveBeenCalled();
    });
  });

  describe('dispatch — broadcasts and email safety', () => {
    const payload = { userId: 'user-1', type: 'PROMOTIONAL' as const, title: 'Happy hour', message: 'Tasks are live' };
    const allEnabled = { inAppEnabled: true, emailEnabled: true, pushEnabled: true };

    beforeEach(() => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue(allEnabled);
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-1' });
      mockUserRepository.findByIdSimple.mockResolvedValue({ email: 'priya@example.com' });
      mockDeviceRepository.findByUserId.mockResolvedValue([{ pushToken: 'token-1' }]);
    });

    it('links every channel copy to its broadcast, so delivery can be counted per broadcast', async () => {
      await service.dispatch({ ...payload, channels: ['IN_APP', 'EMAIL', 'PUSH'], broadcastId: 'b1' });

      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(3);
      for (const [record] of mockNotificationRepository.create.mock.calls) {
        expect(record.broadcast).toEqual({ connect: { id: 'b1' } });
      }
    });

    it('leaves ordinary notifications unlinked', async () => {
      await service.dispatch({ ...payload, channels: ['IN_APP'] });

      expect(mockNotificationRepository.create.mock.calls[0][0]).not.toHaveProperty('broadcast');
    });

    it('still respects a user who opted out of a channel, broadcast or not', async () => {
      mockPreferenceRepository.getOrCreate.mockResolvedValue({ ...allEnabled, pushEnabled: false, emailEnabled: false });

      await service.dispatch({ ...payload, channels: ['IN_APP', 'EMAIL', 'PUSH'], broadcastId: 'b1' });

      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationRepository.create.mock.calls[0][0].channel).toBe('IN_APP');
      expect(mockPushService.sendToTokens).not.toHaveBeenCalled();
      expect(mockEmailQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('escapes the message in the email body, since it can contain a name or admin-typed text', async () => {
      await service.dispatch({ ...payload, message: 'Hi <script>alert(1)</script> & "friends"', channels: ['EMAIL'] });

      const email = mockEmailQueueService.enqueue.mock.calls[0][0];
      expect(email.html).toBe('<p>Hi &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;friends&quot;</p>');
      expect(email.html).not.toContain('<script>');
    });

    it('keeps the stored in-app and push text exactly as written', async () => {
      await service.dispatch({ ...payload, message: 'Fish & Chips <3', channels: ['IN_APP'] });

      expect(mockNotificationRepository.create.mock.calls[0][0].message).toBe('Fish & Chips <3');
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
