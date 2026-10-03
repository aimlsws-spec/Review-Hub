import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { RewardRepository } from '../../wallet/repositories';
import { GAMIFICATION_EVENTS } from '../constants';
import { BadgeRepository, GamificationProfileRepository } from '../repositories';

import { GamificationService } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;

  const mockProfileRepository = { getOrCreate: jest.fn(), recordActivity: jest.fn() };
  const mockBadgeRepository = {
    findEarnedByUser: jest.fn(),
    findAll: jest.fn(),
    findActiveUnearnedForUser: jest.fn(),
    award: jest.fn(),
    countPaidReferrals: jest.fn(),
    findActiveByCriteria: jest.fn(),
    holdersAmong: jest.fn(),
    withOpenFraudFlags: jest.fn(),
  };
  const mockRewardRepository = { countCreditedByUser: jest.fn(), countCreditedForTaskTypes: jest.fn(), topEarnersBetween: jest.fn() };
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

  describe('getProfile', () => {
    it('adds the tier and the way to the next one', async () => {
      mockProfileRepository.getOrCreate.mockResolvedValue({ userId: 'user-1', xp: 800, level: 3, currentStreak: 2 });

      const result = await service.getProfile('user-1');

      expect(result).toEqual(
        expect.objectContaining({ xp: 800, level: 3, tier: 'BRONZE', nextTier: 'SILVER', xpToNextTier: 800, progressPercent: 50 }),
      );
    });
  });

  describe('achievement badges', () => {
    const profile = { level: 1, xp: 50, currentStreak: 1 };

    it('counts review tasks and paid referrals, only for badges that need them', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'b-reviews', code: 'REVIEWS_100', name: '100 Reviews', criteriaType: 'REVIEW_TASK_COUNT', criteriaValue: 100 },
        { id: 'b-refs', code: 'REFERRALS_50', name: '50 Referrals', criteriaType: 'REFERRAL_COUNT', criteriaValue: 50 },
      ]);
      mockRewardRepository.countCreditedForTaskTypes.mockResolvedValue(100);
      mockBadgeRepository.countPaidReferrals.mockResolvedValue(49);

      await service.recordActivity('user-1', 50);

      expect(mockRewardRepository.countCreditedForTaskTypes).toHaveBeenCalledWith('user-1', ['GOOGLE_REVIEW', 'PLAY_STORE_REVIEW']);
      expect(mockRewardRepository.countCreditedByUser).not.toHaveBeenCalled();
      expect(mockBadgeRepository.award).toHaveBeenCalledWith('user-1', 'b-reviews');
      expect(mockBadgeRepository.award).not.toHaveBeenCalledWith('user-1', 'b-refs');
    });

    it('never awards a top earner badge on activity', async () => {
      mockProfileRepository.recordActivity.mockResolvedValue({ profile: { level: 99, xp: 999999, currentStreak: 99 }, leveledUp: false });
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'b-top', code: 'TOP_EARNER', name: 'Top Earner', criteriaType: 'TOP_EARNER_MONTHLY', criteriaValue: 10 },
      ]);

      await service.recordActivity('user-1', 50);

      expect(mockBadgeRepository.award).not.toHaveBeenCalled();
    });

    it('checks badges for the referrer when a referral is paid', async () => {
      mockProfileRepository.getOrCreate.mockResolvedValue(profile);
      mockBadgeRepository.findActiveUnearnedForUser.mockResolvedValue([
        { id: 'b-refs', code: 'REFERRALS_50', name: '50 Referrals', criteriaType: 'REFERRAL_COUNT', criteriaValue: 50 },
      ]);
      mockBadgeRepository.countPaidReferrals.mockResolvedValue(50);

      await service.checkBadges('referrer-1');

      expect(mockBadgeRepository.award).toHaveBeenCalledWith('referrer-1', 'b-refs');
    });
  });

  describe('awardTopEarners', () => {
    const badge = { id: 'b-top', code: 'TOP_EARNER', name: 'Top Earner', criteriaValue: 2 };

    beforeEach(() => {
      mockBadgeRepository.findActiveByCriteria.mockResolvedValue([badge]);
      mockRewardRepository.topEarnersBetween.mockResolvedValue([
        { userId: 'flagged', amount: 900 },
        { userId: 'u1', amount: 500 },
        { userId: 'u2', amount: 400 },
        { userId: 'u3', amount: 300 },
      ]);
      mockBadgeRepository.withOpenFraudFlags.mockResolvedValue(new Set(['flagged']));
      mockBadgeRepository.holdersAmong.mockResolvedValue(new Set(['u2']));
    });

    it('awards the top earners of the previous India month, skipping flagged people and existing holders', async () => {
      const result = await service.awardTopEarners(new Date('2026-10-01T03:00:00Z'));

      expect(mockRewardRepository.topEarnersBetween).toHaveBeenCalledWith(
        new Date('2026-08-31T18:30:00.000Z'),
        new Date('2026-09-30T18:30:00.000Z'),
        6,
      );
      expect(mockBadgeRepository.holdersAmong).toHaveBeenCalledWith('b-top', ['u1', 'u2']);
      expect(mockBadgeRepository.award).toHaveBeenCalledTimes(1);
      expect(mockBadgeRepository.award).toHaveBeenCalledWith('u1', 'b-top');
      expect(result).toEqual({ month: '2026-09', awarded: 1 });
    });

    it('does nothing when there is no active top earner badge', async () => {
      mockBadgeRepository.findActiveByCriteria.mockResolvedValue([]);

      await expect(service.awardTopEarners(new Date('2026-10-01T03:00:00Z'))).resolves.toEqual({ month: '2026-09', awarded: 0 });
      expect(mockRewardRepository.topEarnersBetween).not.toHaveBeenCalled();
    });
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
