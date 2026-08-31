import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class ReferralRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ReferralCreateInput) {
    return this.prisma.referral.create({ data });
  }

  async findByReferredUserId(referredUserId: string) {
    return this.prisma.referral.findUnique({ where: { referredUserId } });
  }

  async findByReferrer(params: { referrerId: string; page: number; limit: number }) {
    const { referrerId, page, limit } = params;
    const where: Prisma.ReferralWhereInput = { referrerId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { referredUser: { select: { id: true, firstName: true, lastName: true, createdAt: true } } },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async markRewardIssued(id: string, amount: number) {
    return this.prisma.referral.update({
      where: { id },
      data: { rewardIssued: true, rewardAmount: amount, completedAt: new Date() },
    });
  }

  async createReward(data: Prisma.ReferralRewardCreateInput) {
    return this.prisma.referralReward.create({ data });
  }

  async markRewardCredited(id: string, walletTransactionId: string) {
    return this.prisma.referralReward.update({
      where: { id },
      data: { status: 'CREDITED', creditedAt: new Date(), walletTransaction: { connect: { id: walletTransactionId } } },
    });
  }

  /** Top referrers ranked by successful-referral count, most first. */
  async getLeaderboard(limit: number) {
    const grouped = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      where: { deletedAt: null },
      _count: { referrerId: true },
      _sum: { rewardAmount: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map((g) => g.referrerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g, index) => ({
      rank: index + 1,
      user: userById.get(g.referrerId) ?? null,
      totalReferred: g._count.referrerId,
      totalRewardEarned: Number(g._sum.rewardAmount ?? 0),
    }));
  }

  async getStats(referrerId: string) {
    const [totalReferred, rewarded] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId, deletedAt: null } }),
      this.prisma.referral.aggregate({
        where: { referrerId, rewardIssued: true },
        _sum: { rewardAmount: true },
        _count: true,
      }),
    ]);

    return {
      totalReferred,
      totalRewarded: rewarded._count,
      totalRewardEarned: Number(rewarded._sum.rewardAmount ?? 0),
    };
  }
}
