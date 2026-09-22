import { Injectable, Logger } from '@nestjs/common';

import { getIstMonthBoundaries } from '@common/utils/date.util';

import { LeaderboardPeriod } from '../constants';
import { LeaderboardQueryDto } from '../dto';
import { LeaderboardEntry, LeaderboardRange, LeaderboardStanding, LeaderboardView } from '../interfaces';
import { LeaderboardRepository } from '../repositories';

/**
 * A name that is safe to show to strangers: the first name and the first letter of the last one ("Priya S.").
 * The full name, the email and the id stay private.
 */
export function toDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const initial = [...lastName.trim()][0]?.toLocaleUpperCase();
  if (!first) return initial ? `${initial}.` : 'Member';
  return initial ? `${first} ${initial}.` : first;
}

/**
 * The public leaderboard: who earned most from rewards, this month or ever.
 *
 * It is opt-out. Anyone can hide themselves; a hidden person is not ranked, not shown, and does not push
 * anyone else's rank down. Only a display name and an avatar leave this service, never an id.
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly repository: LeaderboardRepository) {}

  /** The board for a period, plus where the person asking stands (which may be outside the list they see). */
  async view(userId: string, query: LeaderboardQueryDto): Promise<LeaderboardView> {
    const range = this.rangeFor(query.period);
    const top = await this.repository.topEarners(range, query.limit);
    const profiles = new Map((await this.repository.findProfiles(top.map((row) => row.userId))).map((profile) => [profile.id, profile]));

    // People on the same total share a rank, so a tie for first is two number ones and the next is third.
    // Ranks come from the ranking itself, before anyone is dropped, so a skipped row can not shift them.
    const ranks = top.map((row, index) => (index > 0 && top[index - 1].totalEarned === row.totalEarned ? 0 : index + 1));
    ranks.forEach((rank, index) => {
      if (rank === 0) ranks[index] = ranks[index - 1];
    });

    const entries: LeaderboardEntry[] = [];
    top.forEach((row, index) => {
      const profile = profiles.get(row.userId);
      // Someone who left (or was hidden) between the two reads is skipped rather than shown as a blank row.
      if (!profile) return;
      entries.push({ rank: ranks[index], displayName: toDisplayName(profile.firstName, profile.lastName), avatarUrl: profile.avatarUrl ?? null, totalEarned: row.totalEarned, isMe: row.userId === userId });
    });

    const mine = entries.find((entry) => entry.isMe);
    const me = mine ? { visible: true, rank: mine.rank, totalEarned: mine.totalEarned } : await this.standingOutsideTheList(userId, range);

    return { period: query.period, resetsAt: range?.end ?? null, entries, me };
  }

  /** Hides or shows the person. Idempotent: asking for what is already true changes nothing. */
  async setVisibility(userId: string, visible: boolean): Promise<{ visible: boolean }> {
    await this.repository.setHidden(userId, !visible);
    this.logger.log(`Leaderboard visibility changed: user=${userId} visible=${visible}`);
    return { visible };
  }

  private async standingOutsideTheList(userId: string, range: LeaderboardRange): Promise<LeaderboardStanding> {
    if (await this.repository.isHidden(userId)) return { visible: false, rank: null, totalEarned: 0 };

    const totalEarned = await this.repository.totalFor(userId, range);
    // Nothing earned in this period yet: not on the board, so no rank to show.
    if (totalEarned <= 0) return { visible: true, rank: null, totalEarned: 0 };

    return { visible: true, rank: (await this.repository.countEarningMoreThan(totalEarned, range)) + 1, totalEarned };
  }

  private rangeFor(period: LeaderboardPeriod): LeaderboardRange {
    return period === 'all_time' ? null : getIstMonthBoundaries();
  }
}
