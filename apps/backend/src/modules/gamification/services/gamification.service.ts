import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadgeCriteriaType } from '@prisma/client';

import { getIstMonthBoundaries } from '@common/utils';

import { RewardRepository } from '../../wallet/repositories';
import { GAMIFICATION_CONSTANTS, GAMIFICATION_EVENTS, REVIEW_TASK_TYPES } from '../constants';
import { BadgeEarnedEvent, LevelUpEvent } from '../events';
import { BadgeRepository, GamificationProfileRepository } from '../repositories';
import { tierProgress } from '../tiers';

/** Counts some badges need, fetched only when a candidate badge uses them. */
interface ActivityCounts {
  rewards: number;
  reviews: number;
  referrals: number;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly profileRepository: GamificationProfileRepository,
    private readonly badgeRepository: BadgeRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** XP, level and streak, with the named tier (Bronze to Platinum) and how far it is to the next one. */
  async getProfile(userId: string) {
    const profile = await this.profileRepository.getOrCreate(userId);
    return { ...profile, ...tierProgress(profile.level, profile.xp) };
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

  /** Checks badges outside a task reward, e.g. after a referral reward is paid (the referral badges count those). */
  async checkBadges(userId: string) {
    const profile = await this.profileRepository.getOrCreate(userId);
    await this.evaluateBadges(userId, profile);
  }

  /**
   * Awards each active TOP_EARNER_MONTHLY badge to the top `criteriaValue` task earners of the IST month before
   * `now`. People with an unresolved fraud flag are passed over and the next earner takes the place. A badge is held
   * once, so a repeat winner is not awarded again. Safe to run twice for the same month.
   */
  async awardTopEarners(now: Date = new Date()): Promise<{ month: string; awarded: number }> {
    const thisMonth = getIstMonthBoundaries(now);
    const lastMonth = getIstMonthBoundaries(new Date(thisMonth.start.getTime() - 1));
    const month = new Date(lastMonth.start.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 7);

    const badges = await this.badgeRepository.findActiveByCriteria('TOP_EARNER_MONTHLY');
    let awarded = 0;
    for (const badge of badges) {
      const ranked = await this.rewardRepository.topEarnersBetween(lastMonth.start, lastMonth.end, badge.criteriaValue * 3);
      const flagged = await this.badgeRepository.withOpenFraudFlags(ranked.map((r) => r.userId));
      const winners = ranked.filter((r) => r.amount > 0 && !flagged.has(r.userId)).slice(0, badge.criteriaValue);
      const holders = await this.badgeRepository.holdersAmong(badge.id, winners.map((w) => w.userId));

      for (const winner of winners) {
        if (holders.has(winner.userId)) continue;
        await this.awardBadge(winner.userId, badge);
        awarded += 1;
      }
    }
    this.logger.log(`Top earner badges for ${month}: ${awarded} awarded`);
    return { month, awarded };
  }

  private async evaluateBadges(userId: string, profile: { xp: number; level: number; currentStreak: number }) {
    const candidates = await this.badgeRepository.findActiveUnearnedForUser(userId);
    if (candidates.length === 0) return;

    // Each count is only fetched if a candidate needs it, so the common path costs no extra query.
    const needs = (type: BadgeCriteriaType) => candidates.some((badge: { criteriaType: string }) => badge.criteriaType === type);
    const counts: ActivityCounts = {
      rewards: needs('REWARD_COUNT') ? await this.rewardRepository.countCreditedByUser(userId) : 0,
      reviews: needs('REVIEW_TASK_COUNT') ? await this.rewardRepository.countCreditedForTaskTypes(userId, [...REVIEW_TASK_TYPES]) : 0,
      referrals: needs('REFERRAL_COUNT') ? await this.badgeRepository.countPaidReferrals(userId) : 0,
    };

    for (const badge of candidates) {
      if (this.meetsCriteria(badge.criteriaType, badge.criteriaValue, profile, counts)) await this.awardBadge(userId, badge);
    }
  }

  private async awardBadge(userId: string, badge: { id: string; code: string; name: string }) {
    await this.badgeRepository.award(userId, badge.id);
    this.logger.log(`User ${userId} earned badge ${badge.code}`);
    this.eventEmitter.emit(GAMIFICATION_EVENTS.BADGE_EARNED, new BadgeEarnedEvent(userId, badge.id, badge.name));
  }

  private meetsCriteria(
    criteriaType: BadgeCriteriaType,
    criteriaValue: number,
    profile: { xp: number; level: number; currentStreak: number },
    counts: ActivityCounts,
  ): boolean {
    switch (criteriaType) {
      case 'XP_THRESHOLD':
        return profile.xp >= criteriaValue;
      case 'STREAK_THRESHOLD':
        return profile.currentStreak >= criteriaValue;
      case 'LEVEL_THRESHOLD':
        return profile.level >= criteriaValue;
      case 'REWARD_COUNT':
        return counts.rewards >= criteriaValue;
      case 'REVIEW_TASK_COUNT':
        return counts.reviews >= criteriaValue;
      case 'REFERRAL_COUNT':
        return counts.referrals >= criteriaValue;
      // Only the monthly job awards these.
      case 'TOP_EARNER_MONTHLY':
      default:
        return false;
    }
  }
}
