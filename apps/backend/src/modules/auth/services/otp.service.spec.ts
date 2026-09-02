import * as crypto from 'crypto';

import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OtpType } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CacheService } from '../../../cache/cache.service';
import { MailService } from '../../../mail/mail.service';
import { SmsService } from '../../../sms/sms.service';
import { OtpRepository } from '../repositories/otp.repository';
import { UserRepository } from '../repositories/user.repository';

import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;

  const mockOtpRepository = {
    findLatestByUserAndType: jest.fn(),
    create: jest.fn(),
    markVerified: jest.fn(),
    markExpired: jest.fn(),
    markExhausted: jest.fn(),
    incrementAttempts: jest.fn(),
    expireAllByUserAndType: jest.fn(),
  };

  const mockUserRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockMailService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockSmsService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: OtpRepository, useValue: mockOtpRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MailService, useValue: mockMailService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);

    jest.clearAllMocks();
    // Real env vars are always strings — mocking with actual numbers here
    // masked the exact bug this regresses against (ConfigService.get<number>()
    // doesn't coerce; ../otp.service.ts used to pass the raw string straight
    // to Prisma's Int field and blew up at runtime).
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        OTP_LENGTH: '6',
        OTP_EXPIRY_MINUTES: '5',
        OTP_MAX_ATTEMPTS: '5',
        OTP_RESEND_COOLDOWN_SECONDS: '60',
      };
      return config[key];
    });
  });

  describe('sendOtp', () => {
    it('should throw if cooldown active', async () => {
      mockCacheService.get.mockResolvedValue(1);

      await expect(service.sendOtp('user-1', OtpType.REGISTRATION)).rejects.toThrow(BadRequestException);
    });

    it('should create OTP and send email', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const user = { id: 'user-1', email: 'test@example.com' };
      mockUserRepository.findById.mockResolvedValue(user);
      mockOtpRepository.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.sendOtp('user-1', OtpType.REGISTRATION);

      expect(mockOtpRepository.expireAllByUserAndType).toHaveBeenCalledWith('user-1', OtpType.REGISTRATION);
      expect(mockOtpRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: 'user-1' } },
          type: OtpType.REGISTRATION,
          code: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hash
          maxAttempts: 5,
        }),
      );
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@example.com', subject: expect.stringContaining('OTP') }),
      );
      expect(mockSmsService.send).not.toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'OTP sent successfully');
      expect(result).toHaveProperty('expiresIn', 300);
    });

    it('should send SMS when the user has a phone number (email-less accounts must still get an OTP)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const user = { id: 'user-1', phone: '+919876543210' };
      mockUserRepository.findById.mockResolvedValue(user);
      mockOtpRepository.create.mockResolvedValue({ id: 'otp-1' });

      await service.sendOtp('user-1', OtpType.REGISTRATION);

      expect(mockMailService.send).not.toHaveBeenCalled();
      expect(mockSmsService.send).toHaveBeenCalledWith('+919876543210', expect.stringContaining('OTP'));
    });

    it('should send both email and SMS when the user has both', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const user = { id: 'user-1', email: 'test@example.com', phone: '+919876543210' };
      mockUserRepository.findById.mockResolvedValue(user);
      mockOtpRepository.create.mockResolvedValue({ id: 'otp-1' });

      await service.sendOtp('user-1', OtpType.REGISTRATION);

      expect(mockMailService.send).toHaveBeenCalled();
      expect(mockSmsService.send).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw if no OTP found', async () => {
      mockOtpRepository.findLatestByUserAndType.mockResolvedValue(null);

      await expect(service.verifyOtp('user-1', OtpType.REGISTRATION, '123456')).rejects.toThrow(BadRequestException);
    });

    it('should verify email when OTP matches', async () => {
      const hashedCode = crypto.createHash('sha256').update('123456').digest('hex');
      const otp = { id: 'otp-1', status: 'PENDING', expiresAt: new Date(Date.now() + 60000), attempts: 0, maxAttempts: 5, code: hashedCode };
      mockOtpRepository.findLatestByUserAndType.mockResolvedValue(otp);

      const result = await service.verifyOtp('user-1', OtpType.EMAIL_VERIFICATION, '123456');

      expect(mockOtpRepository.markVerified).toHaveBeenCalledWith('otp-1');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { emailVerifiedAt: expect.any(Date) });
      expect(mockEventEmitter.emit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw if OTP is exhausted', async () => {
      const otp = { id: 'otp-1', status: 'PENDING', expiresAt: new Date(Date.now() + 60000), attempts: 4, maxAttempts: 5, code: 'wrong' };
      mockOtpRepository.findLatestByUserAndType.mockResolvedValue(otp);

      await expect(service.verifyOtp('user-1', OtpType.REGISTRATION, 'wrong')).rejects.toThrow(BadRequestException);
      expect(mockOtpRepository.markExhausted).toHaveBeenCalledWith('otp-1');
    });
  });

  describe('resendOtp', () => {
    it('should delegate to sendOtp', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockOtpRepository.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.resendOtp('user-1', OtpType.REGISTRATION);

      expect(result).toHaveProperty('message', 'OTP sent successfully');
    });
  });
});
