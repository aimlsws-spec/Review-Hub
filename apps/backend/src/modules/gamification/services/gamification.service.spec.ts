import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { RewardRepository } from '../../wallet/repositories';
import { GAMIFICATION_EVENTS } from '../constants';
import { BadgeRepository, GamificationProfileRepository } from '../repositories';

import { GamificationService } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;

  const mockProfileRepository = { getOrCreate: jest.fn(), recordActivity: jest.fn() };
  const mockBadgeRepository = { findEarnedByUser: jest.fn(), findAll: jest.fn(), findActiveUnearnedForUser: jest.fn(), award: jest.fn() };
  const mockRewardRepository = { countCreditedByUser: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: GamificationProfileRepository, useValue: mockProfileRepository },
        { provide: BadgeRepository, useValue: mockBadgeRepository },
        { provide: RewardRepository, useValue: mockRewardRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    jest.clearAllMocks();
  });

  describe('getBadges', () => {
    it('should flag which active badges the user has already earned', async () => {
      mockBadgeRepository.findEarnedByUser.mockResolvedValue([{ badgeId: 'badge-1', earnedAt: new Date('2026-08-01') }]);
      mockBadgeRepository.findAll.mockResolvedValue({ data: [{ id: 'badge-1', name: 'First' }, { id: 'badge-2', name: 'Second' }] });

      const result = await service.getBadges('user-1');

      expect(result).toEqual([
        { id: 'badge-1', name: 'First', earned: true, earnedAt: new Date('2026-08-01') },
        { id: 'badge-2', name: 'Second', earned: false, earnedAt: null },
      ]);
    });
  });

  describe('recordActivity', () => {
    it('should emit level_up when the profile update reports a level increase', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 3, xp: 300, currentStreak: 2 }, leveledUp: true });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([]);

      await service.recordActivity('user-1', 50);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(GAMIFICATION_EVENTS.LEVEL_UP, expect.objectContaining({ userId: 'user-1', newLevel: 3 }));
    });

    it('should not emit level_up when the level is unchanged', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 1, xp: 10, currentStreak: 1 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([]);

      await service.recordActivity('user-1', 10);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(GAMIFICATION_EVENTS.LEVEL_UP, expect.anything());
    });

    it('should award an XP-threshold badge once the profile crosses it', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 1, xp: 150, currentStreak: 1 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'badge-1', code: 'XP_100', name: 'Getting Started', criteriaType: 'XP_THRESHOLD', criteriaValue: 100 },
      ]);

      await service.recordActivity('user-1', 150);

      expect(mockBadgeRepository.award).toHaveBeenCalledWith('user-1', 'badge-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(GAMIFICATION_EVENTS.BADGE_EARNED, expect.objectContaining({ badgeId: 'badge-1' }));
    });

    it('should not award a badge whose threshold has not been reached', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 1, xp: 50, currentStreak: 1 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'badge-1', code: 'XP_100', name: 'Getting Started', criteriaType: 'XP_THRESHOLD', criteriaValue: 100 },
      ]);

      await service.recordActivity('user-1', 50);

      expect(mockBadgeRepository.award).not.toHaveBeenCalled();
    });

    it('should only query reward count when a REWARD_COUNT badge is actually a candidate', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 1, xp: 50, currentStreak: 1 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'badge-1', code: 'FIVE_REWARDS', name: 'Five Rewards', criteriaType: 'REWARD_COUNT', criteriaValue: 5 },
      ]);
      mockRewardRepository.countCreditedByUser.mockResolvedValue(5);

      await service.recordActivity('user-1', 50);

      expect(mockRewardRepository.countCreditedByUser).toHaveBeenCalledWith('user-1');
      expect(mockBadgeRepository.award).toHaveBeenCalledWith('user-1', 'badge-1');
    });

    it('should skip the reward-count query entirely when no candidate needs it', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 1, xp: 150, currentStreak: 1 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'badge-1', code: 'XP_100', name: 'Getting Started', criteriaType: 'XP_THRESHOLD', criteriaValue: 100 },
      ]);

      await service.recordActivity('user-1', 150);

      expect(mockRewardRepository.countCreditedByUser).not.toHaveBeenCalled();
    });
  });
});
