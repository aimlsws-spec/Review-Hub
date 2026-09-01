import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { GamificationProfileRepository } from './gamification-profile.repository';

describe('GamificationProfileRepository', () => {
  let repository: GamificationProfileRepository;

  const mockTx = {
    userGamificationProfile: { upsert: jest.fn(), update: jest.fn() },
  };
  const mockPrisma = {
    userGamificationProfile: { findUnique: jest.fn(), create: jest.fn() },
    transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamificationProfileRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<GamificationProfileRepository>(GamificationProfileRepository);
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return the existing profile when one exists', async () => {
      mockPrisma.userGamificationProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ id: 'profile-1' });
      expect(mockPrisma.userGamificationProfile.create).not.toHaveBeenCalled();
    });

    it('should create a profile when none exists', async () => {
      mockPrisma.userGamificationProfile.findUnique.mockResolvedValue(null);
      mockPrisma.userGamificationProfile.create.mockResolvedValue({ id: 'profile-1' });

      const result = await repository.getOrCreate('user-1');
      expect(result).toEqual({ id: 'profile-1' });
    });
  });

  describe('recordActivity', () => {
    it('should start the streak at 1 for a brand-new profile', async () => {
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActivityDate: null,
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({ level: 1, currentStreak: 1 });

      await repository.recordActivity('user-1', 50);

      expect(mockTx.userGamificationProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ xp: 50, currentStreak: 1, longestStreak: 1 }),
      });
    });

    it('should leave the streak unchanged for a second activity on the same calendar day', async () => {
      const today = new Date('2026-08-31T08:00:00.000Z');
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 100, level: 2, currentStreak: 3, longestStreak: 3, lastActivityDate: new Date('2026-08-31T00:00:00.000Z'),
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({});
      jest.useFakeTimers().setSystemTime(today);

      await repository.recordActivity('user-1', 20);

      expect(mockTx.userGamificationProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ currentStreak: 3, longestStreak: 3 }),
      });
      jest.useRealTimers();
    });

    it('should extend the streak by one on the very next calendar day', async () => {
      const today = new Date('2026-09-01T08:00:00.000Z');
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 100, level: 2, currentStreak: 3, longestStreak: 3, lastActivityDate: new Date('2026-08-31T00:00:00.000Z'),
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({});
      jest.useFakeTimers().setSystemTime(today);

      await repository.recordActivity('user-1', 20);

      expect(mockTx.userGamificationProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ currentStreak: 4, longestStreak: 4 }),
      });
      jest.useRealTimers();
    });

    it('should reset the streak to 1 after a missed day', async () => {
      const today = new Date('2026-09-05T08:00:00.000Z');
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 100, level: 2, currentStreak: 5, longestStreak: 5, lastActivityDate: new Date('2026-08-31T00:00:00.000Z'),
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({});
      jest.useFakeTimers().setSystemTime(today);

      await repository.recordActivity('user-1', 20);

      expect(mockTx.userGamificationProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ currentStreak: 1, longestStreak: 5 }),
      });
      jest.useRealTimers();
    });

    it('should report leveledUp when the new XP total crosses into a higher level', async () => {
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 90, level: 1, currentStreak: 1, longestStreak: 1, lastActivityDate: null,
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({ level: 2 });

      const result = await repository.recordActivity('user-1', 20);

      expect(result.leveledUp).toBe(true);
    });

    it('should report leveledUp as false when the level does not change', async () => {
      mockTx.userGamificationProfile.upsert.mockResolvedValue({
        userId: 'user-1', xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActivityDate: null,
      });
      mockTx.userGamificationProfile.update.mockResolvedValue({ level: 1 });

      const result = await repository.recordActivity('user-1', 5);

      expect(result.leveledUp).toBe(false);
    });
  });
});
