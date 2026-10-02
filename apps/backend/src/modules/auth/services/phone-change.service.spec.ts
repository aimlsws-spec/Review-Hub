import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, ConflictException } from '@common/exceptions/domain.exceptions';

import { CacheService } from '../../../cache/cache.service';
import { UserRepository } from '../repositories/user.repository';

import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { PhoneChangeService } from './phone-change.service';

describe('PhoneChangeService', () => {
  let service: PhoneChangeService;

  const mockUserRepository = { findByIdSimple: jest.fn(), findByPhone: jest.fn(), update: jest.fn() };
  const mockPasswordService = { verify: jest.fn() };
  const mockOtpService = { sendOtp: jest.fn(), verifyOtp: jest.fn() };
  const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  const user = { id: 'user-1', phone: '+919876543210', passwordHash: 'hashed' };
  const newPhone = '+919811122233';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhoneChangeService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: CacheService, useValue: mockCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PhoneChangeService>(PhoneChangeService);
    jest.clearAllMocks();
    mockUserRepository.findByIdSimple.mockResolvedValue(user);
    mockUserRepository.findByPhone.mockResolvedValue(null);
    mockPasswordService.verify.mockResolvedValue(true);
    mockOtpService.sendOtp.mockResolvedValue({ message: 'OTP sent successfully', expiresIn: 300 });
    mockOtpService.verifyOtp.mockResolvedValue(true);
  });

  describe('request', () => {
    it('sends the code to the new number and remembers which number is waiting', async () => {
      const result = await service.request('user-1', newPhone, 'Passw0rd!23');

      expect(mockOtpService.sendOtp).toHaveBeenCalledWith('user-1', 'PHONE_CHANGE', newPhone);
      expect(mockCache.set).toHaveBeenCalledWith('phone_change:user-1', { newPhone }, 600);
      expect(result).toEqual({ message: 'A code was sent to your new number', expiresIn: 300, sentTo: '****2233' });
    });

    it('asks for the current password when the account has one', async () => {
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.request('user-1', newPhone, 'wrong')).rejects.toThrow('Current password is incorrect');
      await expect(service.request('user-1', newPhone)).rejects.toThrow('Current password is incorrect');
      expect(mockOtpService.sendOtp).not.toHaveBeenCalled();
    });

    it('needs no password for an account that never had one', async () => {
      mockUserRepository.findByIdSimple.mockResolvedValue({ ...user, passwordHash: null });

      await service.request('user-1', newPhone);

      expect(mockPasswordService.verify).not.toHaveBeenCalled();
      expect(mockOtpService.sendOtp).toHaveBeenCalled();
    });

    it('refuses the number the account already has', async () => {
      await expect(service.request('user-1', user.phone, 'Passw0rd!23')).rejects.toThrow(BadRequestException);
    });

    it("refuses a number that belongs to someone else's account", async () => {
      mockUserRepository.findByPhone.mockResolvedValue({ id: 'user-2' });

      await expect(service.request('user-1', newPhone, 'Passw0rd!23')).rejects.toThrow(ConflictException);
      expect(mockOtpService.sendOtp).not.toHaveBeenCalled();
    });

    // A refused send must not move the waiting number, or a code already sent to one number could confirm another.
    it('keeps the number already waiting when sending is refused', async () => {
      mockOtpService.sendOtp.mockRejectedValue(new BadRequestException('OTP_RESEND_COOLDOWN'));

      await expect(service.request('user-1', newPhone, 'Passw0rd!23')).rejects.toThrow('OTP_RESEND_COOLDOWN');
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    beforeEach(() => mockCache.get.mockResolvedValue({ newPhone }));

    it('changes the number once the code from the new number is right, and tells the old one', async () => {
      await expect(service.verify('user-1', '123456')).resolves.toEqual({ phone: newPhone });

      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('user-1', 'PHONE_CHANGE', '123456');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { phone: newPhone, phoneVerifiedAt: expect.any(Date) });
      expect(mockCache.del).toHaveBeenCalledWith('phone_change:user-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.phone.changed', { userId: 'user-1', oldPhone: user.phone, newPhone });
    });

    it('changes nothing for a wrong code', async () => {
      mockOtpService.verifyOtp.mockRejectedValue(new BadRequestException('OTP_INVALID'));

      await expect(service.verify('user-1', '000000')).rejects.toThrow('OTP_INVALID');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('refuses when no change is waiting', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.verify('user-1', '123456')).rejects.toThrow('No phone number change is waiting');
      expect(mockOtpService.verifyOtp).not.toHaveBeenCalled();
    });

    it('refuses when someone else took the number while the code was on its way', async () => {
      mockUserRepository.findByPhone.mockResolvedValue({ id: 'user-2' });

      await expect(service.verify('user-1', '123456')).rejects.toThrow(ConflictException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
