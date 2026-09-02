import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { SmsService } from './sms.service';

const mockMessagesCreate = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

describe('SmsService', () => {
  let service: SmsService;
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<SmsService>(SmsService);
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should stay disabled when Twilio credentials are missing', () => {
      mockConfigService.get.mockReturnValue('');

      service.onModuleInit();

      expect(service.isEnabled).toBe(false);
    });

    it('should initialize the Twilio client when configured', () => {
      mockConfigService.get.mockReturnValueOnce('AC_sid').mockReturnValueOnce('auth-token');

      service.onModuleInit();

      expect(service.isEnabled).toBe(true);
    });
  });

  describe('send', () => {
    it('should no-op when Twilio is not configured', async () => {
      mockConfigService.get.mockReturnValue('');
      service.onModuleInit();

      await service.send('+919876543210', 'Your OTP is 123456');

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it('should send an SMS when configured', async () => {
      mockConfigService.get
        .mockReturnValueOnce('AC_sid')
        .mockReturnValueOnce('auth-token')
        .mockReturnValueOnce('+15550001111');
      service.onModuleInit();
      mockMessagesCreate.mockResolvedValue({ sid: 'SM123' });

      await service.send('+919876543210', 'Your OTP is 123456');

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        to: '+919876543210',
        from: '+15550001111',
        body: 'Your OTP is 123456',
      });
    });

    it('should swallow errors instead of throwing', async () => {
      mockConfigService.get
        .mockReturnValueOnce('AC_sid')
        .mockReturnValueOnce('auth-token')
        .mockReturnValueOnce('+15550001111');
      service.onModuleInit();
      mockMessagesCreate.mockRejectedValue(new Error('Twilio down'));

      await expect(service.send('+919876543210', 'Your OTP is 123456')).resolves.toBeUndefined();
    });
  });

  describe('sendWhatsapp', () => {
    it('should no-op when the WhatsApp sender is not configured', async () => {
      mockConfigService.get.mockReturnValueOnce('AC_sid').mockReturnValueOnce('auth-token');
      service.onModuleInit();
      mockConfigService.get.mockReturnValue('');

      await service.sendWhatsapp('+919876543210', 'Hello');

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it('should prefix both numbers with whatsapp: when sending', async () => {
      mockConfigService.get
        .mockReturnValueOnce('AC_sid')
        .mockReturnValueOnce('auth-token');
      service.onModuleInit();
      mockConfigService.get.mockReturnValue('+15550002222');
      mockMessagesCreate.mockResolvedValue({ sid: 'SM456' });

      await service.sendWhatsapp('+919876543210', 'Hello');

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        to: 'whatsapp:+919876543210',
        from: 'whatsapp:+15550002222',
        body: 'Hello',
      });
    });
  });
});
