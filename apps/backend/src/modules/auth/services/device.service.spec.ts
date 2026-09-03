import { Test, TestingModule } from '@nestjs/testing';
import { DevicePlatform } from '@prisma/client';

import { DeviceRepository } from '../repositories/device.repository';

import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;

  const mockDeviceRepository = {
    findByFingerprint: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastSeen: jest.fn(),
    deactivate: jest.fn(),
    deactivateAllByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: DeviceRepository, useValue: mockDeviceRepository },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should create new device when no fingerprint match', async () => {
      mockDeviceRepository.findByFingerprint.mockResolvedValue(null);
      mockDeviceRepository.create.mockResolvedValue({ id: 'device-1' });

      const result = await service.registerDevice('user-1', {
        platform: DevicePlatform.WEB,
        fingerprint: 'fp-1',
      });

      expect(mockDeviceRepository.create).toHaveBeenCalled();
      expect(result).toBe('device-1');
    });

    it('should update existing device when fingerprint matches', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Old Name',
        platform: DevicePlatform.WEB,
        os: 'Windows',
      };
      mockDeviceRepository.findByFingerprint.mockResolvedValue(existingDevice);
      mockDeviceRepository.update.mockResolvedValue({ ...existingDevice, name: 'New Name' });

      const result = await service.registerDevice('user-1', {
        platform: DevicePlatform.ANDROID,
        name: 'New Name',
        os: 'Android 14',
        fingerprint: 'fp-1',
      });

      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(result).toBe('device-1');
    });

    it('should persist risk signals and a computed riskScore on a new device', async () => {
      mockDeviceRepository.findByFingerprint.mockResolvedValue(null);
      mockDeviceRepository.create.mockResolvedValue({ id: 'device-1' });

      await service.registerDevice('user-1', {
        platform: DevicePlatform.ANDROID,
        fingerprint: 'fp-1',
        isRooted: true,
        isEmulator: false,
        vpnSuspected: true,
      });

      expect(mockDeviceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isRooted: true, isEmulator: false, vpnSuspected: true, riskScore: 60 }),
      );
    });

    it('should keep an existing risk flag when the latest report omits it', async () => {
      const existingDevice = {
        id: 'device-1',
        platform: DevicePlatform.ANDROID,
        isRooted: true,
        isEmulator: false,
        vpnSuspected: false,
      };
      mockDeviceRepository.findByFingerprint.mockResolvedValue(existingDevice);
      mockDeviceRepository.update.mockResolvedValue(existingDevice);

      await service.registerDevice('user-1', {
        platform: DevicePlatform.ANDROID,
        fingerprint: 'fp-1',
      });

      expect(mockDeviceRepository.update).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({ isRooted: true, isEmulator: false, vpnSuspected: false, riskScore: 40 }),
      );
    });
  });

  describe('calculateRiskScore', () => {
    it('should return 0 when nothing is flagged', () => {
      expect(service.calculateRiskScore({})).toBe(0);
    });

    it('should sum weighted signals and cap at 100', () => {
      expect(service.calculateRiskScore({ isRooted: true })).toBe(40);
      expect(service.calculateRiskScore({ isEmulator: true })).toBe(40);
      expect(service.calculateRiskScore({ vpnSuspected: true })).toBe(20);
      expect(service.calculateRiskScore({ isRooted: true, isEmulator: true, vpnSuspected: true })).toBe(100);
    });
  });

  describe('detectVpnSuspicion', () => {
    it('should flag a Via header as suspicious', () => {
      expect(service.detectVpnSuspicion({ via: '1.1 proxy.example.com' })).toBe(true);
    });

    it('should flag multiple X-Forwarded-For hops as suspicious', () => {
      expect(service.detectVpnSuspicion({ xForwardedFor: '1.2.3.4, 5.6.7.8' })).toBe(true);
    });

    it('should not flag a single X-Forwarded-For hop', () => {
      expect(service.detectVpnSuspicion({ xForwardedFor: '1.2.3.4' })).toBe(false);
    });

    it('should not flag when no signals are present', () => {
      expect(service.detectVpnSuspicion({})).toBe(false);
    });
  });

  describe('getUserDevices', () => {
    it('should return user devices', async () => {
      const devices = [{ id: 'device-1', userId: 'user-1' }];
      mockDeviceRepository.findByUserId.mockResolvedValue(devices);

      const result = await service.getUserDevices('user-1');

      expect(result).toEqual(devices);
    });
  });

  describe('updateLastSeen', () => {
    it('should update device last seen', async () => {
      await service.updateLastSeen('device-1');
      expect(mockDeviceRepository.updateLastSeen).toHaveBeenCalledWith('device-1');
    });
  });

  describe('deactivateDevice', () => {
    it('should deactivate device', async () => {
      await service.deactivateDevice('device-1');
      expect(mockDeviceRepository.deactivate).toHaveBeenCalledWith('device-1');
    });
  });

  describe('deactivateAllDevices', () => {
    it('should deactivate all devices for user', async () => {
      await service.deactivateAllDevices('user-1');
      expect(mockDeviceRepository.deactivateAllByUserId).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should exclude specific device', async () => {
      await service.deactivateAllDevices('user-1', 'device-1');
      expect(mockDeviceRepository.deactivateAllByUserId).toHaveBeenCalledWith('user-1', 'device-1');
    });
  });

  describe('parseUserAgent', () => {
    it('should parse Android user agent', () => {
      const result = service.parseUserAgent('Mozilla/5.0 (Linux; Android 10)');
      expect(result.platform).toBe(DevicePlatform.ANDROID);
      expect(result.os).toContain('Android');
    });

    it('should parse iOS user agent', () => {
      const result = service.parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      expect(result.platform).toBe(DevicePlatform.IOS);
      expect(result.os).toContain('iOS');
    });

    it('should parse Chrome browser', () => {
      const result = service.parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/91.0');
      expect(result.name).toBe('Chrome');
    });

    it('should default to WEB when no user agent', () => {
      const result = service.parseUserAgent(undefined);
      expect(result.platform).toBe(DevicePlatform.WEB);
    });
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint', () => {
      const fp1 = service.generateFingerprint('ua-1', '127.0.0.1');
      const fp2 = service.generateFingerprint('ua-1', '127.0.0.1');
      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(32);
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = service.generateFingerprint('ua-1', '127.0.0.1');
      const fp2 = service.generateFingerprint('ua-2', '127.0.0.1');
      expect(fp1).not.toBe(fp2);
    });
  });
});