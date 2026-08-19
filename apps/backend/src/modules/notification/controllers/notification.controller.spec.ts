import { Test, TestingModule } from '@nestjs/testing';

import { NotificationService } from '../services';

import { NotificationController } from './notification.controller';

describe('NotificationController', () => {
  let controller: NotificationController;

  const mockNotificationService = {
    listMine: jest.fn(),
    getUnreadCount: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockNotificationService }],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listMine should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.listMine('user-1', query as never);
    expect(mockNotificationService.listMine).toHaveBeenCalledWith('user-1', query);
  });

  it('getUnreadCount should delegate to the service', async () => {
    await controller.getUnreadCount('user-1');
    expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
  });

  it('getPreferences should delegate to the service', async () => {
    await controller.getPreferences('user-1');
    expect(mockNotificationService.getPreferences).toHaveBeenCalledWith('user-1');
  });

  it('updatePreferences should delegate to the service', async () => {
    const dto = { emailEnabled: false };
    await controller.updatePreferences('user-1', dto);
    expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith('user-1', dto);
  });

  it('markRead should delegate to the service', async () => {
    await controller.markRead('notif-1', 'user-1');
    expect(mockNotificationService.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('markAllRead should delegate to the service', async () => {
    await controller.markAllRead('user-1');
    expect(mockNotificationService.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
