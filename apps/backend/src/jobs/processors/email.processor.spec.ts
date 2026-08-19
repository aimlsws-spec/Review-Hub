import { Test, TestingModule } from '@nestjs/testing';

import { MailService } from '../../mail/mail.service';
import { NotificationRepository } from '../../modules/notification/repositories';

import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  const mockMailService = { send: jest.fn() };
  const mockNotificationRepository = { update: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: MailService, useValue: mockMailService },
        { provide: NotificationRepository, useValue: mockNotificationRepository },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    jest.clearAllMocks();
  });

  it('should send mail and mark the source notification SENT', async () => {
    mockMailService.send.mockResolvedValue(undefined);

    await processor.process({ data: { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', notificationId: 'notif-1' } } as never);

    expect(mockMailService.send).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(mockNotificationRepository.update).toHaveBeenCalledWith('notif-1', { status: 'SENT', sentAt: expect.any(Date) });
  });

  it('should not touch a notification row when no notificationId is present', async () => {
    mockMailService.send.mockResolvedValue(undefined);

    await processor.process({ data: { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' } } as never);

    expect(mockNotificationRepository.update).not.toHaveBeenCalled();
  });

  it('should mark the notification FAILED and rethrow when sending fails', async () => {
    mockMailService.send.mockRejectedValue(new Error('SMTP down'));

    await expect(
      processor.process({ data: { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', notificationId: 'notif-1' } } as never),
    ).rejects.toThrow('SMTP down');

    expect(mockNotificationRepository.update).toHaveBeenCalledWith('notif-1', {
      status: 'FAILED',
      failedReason: 'SMTP down',
    });
  });
});
