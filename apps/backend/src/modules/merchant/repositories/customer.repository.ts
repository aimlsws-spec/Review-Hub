import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CustomerAggregate {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  joinedAt: Date;
  lastVisit: Date | null;
  totalVisits: number;
  lifetimeRewardsPaid: number;
  reviewCount: number;
  averageRating: number | null;
}

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A merchant's "customers" aren't a table of their own — they're derived from
   * whichever platform users have taken part in this merchant's campaigns. Bounded
   * per-merchant, so aggregating in application code (rather than one giant SQL
   * query) is simpler and fine at this scale.
   */
  async getCustomers(merchantId: string): Promise<CustomerAggregate[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { merchantId, deletedAt: null },
      select: { id: true },
    });
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) return [];

    const grouped = await this.prisma.campaignParticipant.groupBy({
      by: ['userId'],
      where: { campaignId: { in: campaignIds }, deletedAt: null },
      _count: { _all: true },
      _sum: { rewardEarned: true },
      _min: { joinedAt: true },
      _max: { completedAt: true },
    });
    if (grouped.length === 0) return [];

    const userIds = grouped.map((g) => g.userId);
    const [users, reviewStats] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      }),
      this.getReviewStatsByEmail(merchantId, userIds),
    ]);
    const usersById = new Map(users.map((u) => [u.id, u]));

    return grouped
      .map((g): CustomerAggregate | null => {
        const user = usersById.get(g.userId);
        if (!user) return null;
        const reviews = user.email ? reviewStats.get(user.email) : undefined;

        return {
          userId: g.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          joinedAt: g._min.joinedAt ?? new Date(),
          lastVisit: g._max.completedAt,
          totalVisits: g._count._all,
          lifetimeRewardsPaid: Number(g._sum.rewardEarned ?? 0),
          reviewCount: reviews?.count ?? 0,
          averageRating: reviews?.avgRating ?? null,
        };
      })
      .filter((c): c is CustomerAggregate => c !== null);
  }

  private async getReviewStatsByEmail(merchantId: string, userIds: string[]) {
    if (userIds.length === 0) return new Map<string, { count: number; avgRating: number }>();

    const grouped = await this.prisma.review.groupBy({
      by: ['customerEmail'],
      where: { merchantId, customerEmail: { not: null }, deletedAt: null },
      _count: { _all: true },
      _avg: { rating: true },
    });

    return new Map(
      grouped
        .filter((g): g is typeof g & { customerEmail: string } => g.customerEmail !== null)
        .map((g) => [g.customerEmail, { count: g._count._all, avgRating: g._avg.rating ?? 0 }]),
    );
  }
}
