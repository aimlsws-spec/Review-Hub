import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as admin from 'firebase-admin';

import { PushService } from './push.service';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(),
}));

describe('PushService', () => {
  let service: PushService;
  const mockConfigService = { get: jest.fn() };
  const mockSendEachForMulticast = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<PushService>(PushService);
    jest.clearAllMocks();
    (admin.initializeApp as jest.Mock).mockReturnValue({});
    (admin.messaging as jest.Mock).mockReturnValue({ sendEachForMulticast: mockSendEachForMulticast });
  });

  describe('onModuleInit', () => {
    it('should stay disabled when Firebase credentials are missing', () => {
      mockConfigService.get.mockReturnValue('');

      service.onModuleInit();

      expect(service.isEnabled).toBe(false);
      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it('should initialize Firebase Admin when fully configured', () => {
      mockConfigService.get
        .mockReturnValueOnce('project-1')
        .mockReturnValueOnce('private-key')
        .mockReturnValueOnce('client@example.com');

      service.onModuleInit();

      expect(service.isEnabled).toBe(true);
      expect(admin.initializeApp).toHaveBeenCalled();
    });
  });

  describe('sendToTokens', () => {
    it('should no-op when Firebase is not configured', async () => {
      mockConfigService.get.mockReturnValue('');
      service.onModuleInit();

      await service.sendToTokens(['token-1'], { title: 'Hi', body: 'Body' });

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should no-op when there are no tokens', async () => {
      mockConfigService.get
        .mockReturnValueOnce('project-1')
        .mockReturnValueOnce('private-key')
        .mockReturnValueOnce('client@example.com');
      service.onModuleInit();

      await service.sendToTokens([], { title: 'Hi', body: 'Body' });

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should send a multicast message when configured and tokens are given', async () => {
      mockConfigService.get
        .mockReturnValueOnce('project-1')
        .mockReturnValueOnce('private-key')
        .mockReturnValueOnce('client@example.com');
      service.onModuleInit();
      mockSendEachForMulticast.mockResolvedValue({ failureCount: 0 });

      await service.sendToTokens(['token-1', 'token-2'], { title: 'Hi', body: 'Body', data: { a: '1' } });

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-1', 'token-2'],
          notification: { title: 'Hi', body: 'Body' },
          data: { a: '1' },
        }),
      );
    });

    it('should swallow errors instead of throwing', async () => {
      mockConfigService.get
        .mockReturnValueOnce('project-1')
        .mockReturnValueOnce('private-key')
        .mockReturnValueOnce('client@example.com');
      service.onModuleInit();
      mockSendEachForMulticast.mockRejectedValue(new Error('FCM down'));

      await expect(service.sendToTokens(['token-1'], { title: 'Hi', body: 'Body' })).resolves.toBeUndefined();
    });
  });
});
