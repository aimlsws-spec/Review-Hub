import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BLOCKED_ACCOUNT_STATUSES } from '../../auth/constants';
import { EarnerProfile, LeaderboardRange, RankedEarner } from '../interfaces';

/**
 * Reads the ranking from the rewards themselves, so it can not drift from what people were actually paid.
 *
 * What counts: cash rewards that were credited and have not been taken back (a clawed-back reward is
 * REVERSED, so it drops out on its own), for people whose account is in good standing and who have not asked to be
 * hidden. An account that has not verified its email or phone yet is still in good standing, as everywhere else in the app.
 * Points and vouchers are left out because their amounts are not rupees and can not be compared.
 */
@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private countedRewards(range: LeaderboardRange): Prisma.RewardWhereInput {
    return {
      status: 'CREDITED',
      rewardType: 'CASH',
      deletedAt: null,
      ...(range ? { creditedAt: { gte: range.start, lt: range.end } } : {}),
      user: { hideFromLeaderboard: false, deletedAt: null, status: { notIn: [...BLOCKED_ACCOUNT_STATUSES] } },
    };
  }

  /** The people who earned most, biggest first. Equal totals are ordered by id only so the order is stable between requests. */
  async topEarners(range: LeaderboardRange, limit: number): Promise<RankedEarner[]> {
    const grouped = await this.prisma.reward.groupBy({
      by: ['userId'],
      where: this.countedRewards(range),
      _sum: { amount: true },
      orderBy: [{ _sum: { amount: 'desc' } }, { userId: 'asc' }],
      take: limit,
    });
    return grouped.map((row) => ({ userId: row.userId, totalEarned: Number(row._sum.amount ?? 0) }));
  }

  async findProfiles(userIds: string[]): Promise<EarnerProfile[]> {
    if (userIds.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
  }

  /** What one person earned in the window, on the same rules as the ranking (so 0 if they are hidden). */
  async totalFor(userId: string, range: LeaderboardRange): Promise<number> {
    const result = await this.prisma.reward.aggregate({
      where: { ...this.countedRewards(range), userId },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  /**
   * How many people earned strictly more than [total]: the viewer's rank is that plus one, and people on the same
   * total share a rank. Counted in the database so a person far down the board does not pull every row above them.
   */
  async countEarningMoreThan(total: number, range: LeaderboardRange): Promise<number> {
    const window = range ? Prisma.sql`AND r.creditedAt >= ${range.start} AND r.creditedAt < ${range.end}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ ahead: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS ahead FROM (
        SELECT r.userId
        FROM rewards r
        INNER JOIN users u ON u.id = r.userId
        WHERE r.status = 'CREDITED'
          AND r.rewardType = 'CASH'
          AND r.deletedAt IS NULL
          ${window}
          AND u.hideFromLeaderboard = 0
          AND u.deletedAt IS NULL
          AND u.status NOT IN (${Prisma.join([...BLOCKED_ACCOUNT_STATUSES])})
        GROUP BY r.userId
        HAVING SUM(r.amount) > ${total.toFixed(2)}
      ) earners
    `);
    return Number(rows[0]?.ahead ?? 0);
  }

  async isHidden(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hideFromLeaderboard: true } });
    return user?.hideFromLeaderboard ?? false;
  }

  async setHidden(userId: string, hidden: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { hideFromLeaderboard: hidden } });
  }
}
