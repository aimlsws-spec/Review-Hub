import { Test, TestingModule } from '@nestjs/testing';

import { CacheService } from '../../../cache/cache.service';
import { DeviceRepository } from '../repositories/device.repository';

import { NewDeviceService, PendingLogin } from './new-device.service';

describe('NewDeviceService', () => {
  let service: NewDeviceService;

  const mockDeviceRepository = { countWithInstallId: jest.fn(), existsForInstall: jest.fn() };
  const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

  const pending: PendingLogin = { userId: 'user-1', rememberMe: false, installIdHash: 'hash-2', vpnSuspected: false };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewDeviceService,
        { provide: DeviceRepository, useValue: mockDeviceRepository },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<NewDeviceService>(NewDeviceService);
    jest.clearAllMocks();
  });

  describe('isUnrecognised', () => {
    it('trusts the first device an account ever reports', async () => {
      mockDeviceRepository.countWithInstallId.mockResolvedValue(0);

      await expect(service.isUnrecognised('user-1', 'hash-1')).resolves.toBe(false);
      await expect(service.isUnrecognised('user-1', undefined)).resolves.toBe(false);
    });

    it('recognises a device the account used before', async () => {
      mockDeviceRepository.countWithInstallId.mockResolvedValue(1);
      mockDeviceRepository.existsForInstall.mockResolvedValue(true);

      await expect(service.isUnrecognised('user-1', 'hash-1')).resolves.toBe(false);
      expect(mockDeviceRepository.existsForInstall).toHaveBeenCalledWith('user-1', 'hash-1');
    });

    it('flags any other device', async () => {
      mockDeviceRepository.countWithInstallId.mockResolvedValue(1);
      mockDeviceRepository.existsForInstall.mockResolvedValue(false);

      await expect(service.isUnrecognised('user-1', 'hash-2')).resolves.toBe(true);
    });

    it('flags a sign-in that sent no device id once the account has a known device', async () => {
      mockDeviceRepository.countWithInstallId.mockResolvedValue(1);

      await expect(service.isUnrecognised('user-1', undefined)).resolves.toBe(true);
      expect(mockDeviceRepository.existsForInstall).not.toHaveBeenCalled();
    });
  });

  describe('challenges', () => {
    it('stores the pending sign-in under a hash of a random token, for a limited time', async () => {
      const token = await service.createChallenge(pending);

      expect(token).toMatch(/^[a-f0-9]{64}$/);
      const [key, value, ttl] = mockCache.set.mock.calls[0];
      expect(key).toMatch(/^login_challenge:[a-f0-9]{64}$/);
      expect(key).not.toContain(token);
      expect(value).toEqual(pending);
      expect(ttl).toBe(600);
    });

    it('returns the pending sign-in only to the device it was issued to', async () => {
      mockCache.get.mockResolvedValue(pending);

      await expect(service.findChallenge('a'.repeat(64), 'hash-2')).resolves.toEqual(pending);
      await expect(service.findChallenge('a'.repeat(64), 'hash-9')).resolves.toBeNull();
      await expect(service.findChallenge('a'.repeat(64), undefined)).resolves.toBeNull();
    });

    it('matches a sign-in that sent no device id only to a request without one', async () => {
      mockCache.get.mockResolvedValue({ ...pending, installIdHash: null });

      await expect(service.findChallenge('a'.repeat(64), undefined)).resolves.toEqual(expect.objectContaining({ userId: 'user-1' }));
    });

    it('returns null for an unknown or expired token', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.findChallenge('a'.repeat(64), 'hash-2')).resolves.toBeNull();
    });

    it('uses the same key to store, read and consume a challenge', async () => {
      const token = await service.createChallenge(pending);
      mockCache.get.mockResolvedValue(pending);
      await service.findChallenge(token, 'hash-2');
      await service.consumeChallenge(token);

      const key = mockCache.set.mock.calls[0][0];
      expect(mockCache.get).toHaveBeenCalledWith(key);
      expect(mockCache.del).toHaveBeenCalledWith(key);
    });
  });
});
