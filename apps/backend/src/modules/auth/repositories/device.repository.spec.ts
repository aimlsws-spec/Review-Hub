import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { DeviceRepository } from './device.repository';

describe('DeviceRepository', () => {
  let repository: DeviceRepository;

  const mockPrisma = {
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<DeviceRepository>(DeviceRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find device by id', async () => {
      const device = { id: 'device-1', userId: 'user-1' };
      mockPrisma.device.findUnique.mockResolvedValue(device);

      const result = await repository.findById('device-1');

      expect(result).toEqual(device);
      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({ where: { id: 'device-1' } });
    });
  });

  describe('findByUserId', () => {
    it('should return active devices for user', async () => {
      const devices = [{ id: 'device-1', userId: 'user-1', isActive: true }];
      mockPrisma.device.findMany.mockResolvedValue(devices);

      const result = await repository.findByUserId('user-1');

      expect(result).toEqual(devices);
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        orderBy: { lastSeenAt: 'desc' },
      });
    });
  });

  describe('findByFingerprint', () => {
    it('should find device by userId and fingerprint', async () => {
      const device = { id: 'device-1', userId: 'user-1', fingerprint: 'fp-1' };
      mockPrisma.device.findUnique.mockResolvedValue(device);

      const result = await repository.findByFingerprint('user-1', 'fp-1');

      expect(result).toEqual(device);
      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({
        where: { userId_fingerprint: { userId: 'user-1', fingerprint: 'fp-1' } },
      });
    });
  });

  describe('create', () => {
    it('should create a device', async () => {
      const data = {
        user: { connect: { id: 'user-1' } },
        platform: 'WEB' as const,
        fingerprint: 'fp-1',
      };
      mockPrisma.device.create.mockResolvedValue({ id: 'device-1', ...data });

      const result = await repository.create(data);

      expect(result).toHaveProperty('id', 'device-1');
    });
  });

  describe('update', () => {
    it('should update device', async () => {
      await repository.update('device-1', { name: 'New Name' });

      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { name: 'New Name' },
      });
    });
  });

  describe('updateLastSeen', () => {
    it('should update last seen timestamp', async () => {
      await repository.updateLastSeen('device-1');

      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { lastSeenAt: expect.any(Date), updatedAt: expect.any(Date) },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate device', async () => {
      await repository.deactivate('device-1');

      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { isActive: false, updatedAt: expect.any(Date) },
      });
    });
  });

  describe('deactivateAllByUserId', () => {
    it('should deactivate all devices for user', async () => {
      await repository.deactivateAllByUserId('user-1');

      expect(mockPrisma.device.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        data: { isActive: false, updatedAt: expect.any(Date) },
      });
    });

    it('should exclude specific device', async () => {
      await repository.deactivateAllByUserId('user-1', 'device-1');

      expect(mockPrisma.device.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true, id: { not: 'device-1' } },
        data: { isActive: false, updatedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteInactiveDevices', () => {
    it('should delete inactive devices older than given date', async () => {
      const olderThan = new Date('2024-01-01');
      mockPrisma.device.deleteMany.mockResolvedValue({ count: 5 });

      await repository.deleteInactiveDevices(olderThan);

      expect(mockPrisma.device.deleteMany).toHaveBeenCalledWith({
        where: { isActive: false, updatedAt: { lt: olderThan } },
      });
    });
  });
});