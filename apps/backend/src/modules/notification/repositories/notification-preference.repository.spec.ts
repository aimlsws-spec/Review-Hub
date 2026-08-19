import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { NotificationPreferenceRepository } from './notification-preference.repository';

describe('NotificationPreferenceRepository', () => {
  let repository: NotificationPreferenceRepository;

  const mockPrisma = {
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferenceRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<NotificationPreferenceRepository>(NotificationPreferenceRepository);
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return the existing preference row when one exists', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({ userId: 'user-1', emailEnabled: true });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ userId: 'user-1', emailEnabled: true });
      expect(mockPrisma.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('should create a default preference row when none exists', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue({ userId: 'user-1' });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ userId: 'user-1' });
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'user-1' } } },
      });
    });
  });

  describe('update', () => {
    it('should update preference flags by userId', async () => {
      mockPrisma.notificationPreference.update.mockResolvedValue({ userId: 'user-1', emailEnabled: false });

      await repository.update('user-1', { emailEnabled: false });
      expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { emailEnabled: false },
      });
    });
  });
});
