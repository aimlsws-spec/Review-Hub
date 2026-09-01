import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RewardRepository } from '../../wallet/repositories';
import { GAMIFICATION_CONSTANTS, GAMIFICATION_EVENTS } from '../constants';
import { BadgeEarnedEvent, LevelUpEvent } from '../events';
import { BadgeRepository, GamificationProfileRepository } from '../repositories';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly profileRepository: GamificationProfileRepository,
    private readonly badgeRepository: BadgeRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getProfile(userId: string) {
    return this.profileRepository.getOrCreate(userId);
  }

  async getBadges(userId: string) {
    const [earned, allActive] = await Promise.all([
      this.badgeRepository.findEarnedByUser(userId),
      this.badgeRepository.findAll({ page: 1, limit: 100, isActive: true }),
    ]);
    const earnedIds = new Set(earned.map((e) => e.badgeId));

    return allActive.data.map((badge) => ({
      ...badge,
      earned: earnedIds.has(badge.id),
      earnedAt: earned.find((e) => e.badgeId === badge.id)?.earnedAt ?? null,
    }));
  }

  /**
   * Called from GamificationListener on every credited reward. Advances
   * XP/level/streak, then checks whether any not-yet-earned badge's
   * threshold is now crossed and awards it.
   */
  async recordActivity(userId: string, rewardAmount: number) {
    const xpGained = Math.round(rewardAmount * GAMIFICATION_CONSTANTS.XP_PER_RUPEE);
    const { profile, leveledUp } = await this.profileRepository.recordActivity(userId, xpGained);

    if (leveledUp) {
      this.logger.log(`User ${userId} leveled up to ${profile.level}`);
      this.eventEmitter.emit(GAMIFICATION_EVENTS.LEVEL_UP, new LevelUpEvent(userId, profile.level));
    }

    await this.evaluateBadges(userId, profile);
  }

  private async evaluateBadges(userId: string, profile: { xp: number; level: number; currentStreak: number }) {
    const candidates = await this.badgeRepository.findActiveUnearnedForUser(userId);
    if (candidates.length === 0) return;

    // Only fetched if a candidate actually needs it — avoids the extra query on the common path.
    const needsRewardCount = candidates.some((badge: { criteriaType: string }) => badge.criteriaType === 'REWARD_COUNT');
    const rewardCount = needsRewardCount ? await this.rewardRepository.countCreditedByUser(userId) : 0;

    for (const badge of candidates) {
      const qualifies = this.meetsCriteria(badge.criteriaType, badge.criteriaValue, profile, rewardCount);
      if (!qualifies) continue;

      await this.badgeRepository.award(userId, badge.id);
      this.logger.log(`User ${userId} earned badge ${badge.code}`);
      this.eventEmitter.emit(GAMIFICATION_EVENTS.BADGE_EARNED, new BadgeEarnedEvent(userId, badge.id, badge.name));
    }
  }

  private meetsCriteria(
    criteriaType: 'XP_THRESHOLD' | 'STREAK_THRESHOLD' | 'LEVEL_THRESHOLD' | 'REWARD_COUNT',
    criteriaValue: number,
    profile: { xp: number; level: number; currentStreak: number },
    rewardCount: number,
  ): boolean {
    switch (criteriaType) {
      case 'XP_THRESHOLD':
        return profile.xp >= criteriaValue;
      case 'STREAK_THRESHOLD':
        return profile.currentStreak >= criteriaValue;
      case 'LEVEL_THRESHOLD':
        return profile.level >= criteriaValue;
      case 'REWARD_COUNT':
        return rewardCount >= criteriaValue;
      default:
        return false;
    }
  }
}
