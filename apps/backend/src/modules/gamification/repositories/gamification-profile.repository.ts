import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { GAMIFICATION_CONSTANTS } from '../constants';

function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / GAMIFICATION_CONSTANTS.XP_PER_LEVEL_FACTOR)) + 1;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function isNextCalendarDay(previous: Date, current: Date): boolean {
  const next = new Date(previous);
  next.setUTCDate(next.getUTCDate() + 1);
  return isSameCalendarDay(next, current);
}

@Injectable()
export class GamificationProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userGamificationProfile.findUnique({ where: { userId } });
  }

  async getOrCreate(userId: string) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.prisma.userGamificationProfile.create({ data: { user: { connect: { id: userId } } } });
  }

  /**
   * Advances XP/level/streak for one credited reward, in a single
   * transaction so a burst of near-simultaneous rewards can't read the same
   * stale profile row twice. Streak logic: same calendar day as last
   * activity leaves the streak untouched (already active today), the very
   * next calendar day extends it, any bigger gap resets it to 1.
   */
  async recordActivity(userId: string, xpGained: number) {
    return this.prisma.transaction(async (tx) => {
      const profile = await tx.userGamificationProfile.upsert({
        where: { userId },
        create: { user: { connect: { id: userId } } },
        update: {},
      });

      const now = new Date();
      let nextStreak = profile.currentStreak;
      if (!profile.lastActivityDate) {
        nextStreak = 1;
      } else if (isSameCalendarDay(profile.lastActivityDate, now)) {
        nextStreak = profile.currentStreak;
      } else if (isNextCalendarDay(profile.lastActivityDate, now)) {
        nextStreak = profile.currentStreak + 1;
      } else {
        nextStreak = 1;
      }

      const previousLevel = profile.level;
      const nextXp = profile.xp + xpGained;
      const nextLevel = levelForXp(nextXp);

      const updated = await tx.userGamificationProfile.update({
        where: { userId },
        data: {
          xp: nextXp,
          level: nextLevel,
          currentStreak: nextStreak,
          longestStreak: Math.max(profile.longestStreak, nextStreak),
          lastActivityDate: now,
        },
      });

      return { profile: updated, leveledUp: nextLevel > previousLevel };
    });
  }
}
