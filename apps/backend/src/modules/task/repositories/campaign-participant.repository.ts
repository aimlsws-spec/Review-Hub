import { Injectable } from '@nestjs/common';
import { ParticipantStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CampaignParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CampaignParticipantCreateInput) {
    return this.prisma.campaignParticipant.create({ data });
  }

  async findByCampaignAndUser(campaignId: string, userId: string) {
    return this.prisma.campaignParticipant.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
  }

  async update(id: string, data: Prisma.CampaignParticipantUpdateInput) {
    return this.prisma.campaignParticipant.update({ where: { id }, data });
  }

  /**
   * The campaigns one person has joined, newest activity first, with what the app shows of each campaign. A campaign
   * a merchant deleted is left out.
   */
  async findForUser(params: { userId: string; statuses: ParticipantStatus[]; page: number; limit: number }) {
    const { userId, statuses, page, limit } = params;
    const where: Prisma.CampaignParticipantWhereInput = {
      userId,
      deletedAt: null,
      status: { in: statuses },
      campaign: { deletedAt: null },
    };
    const [data, total] = await Promise.all([
      this.prisma.campaignParticipant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          status: true,
          joinedAt: true,
          completedAt: true,
          tasksCompleted: true,
          tasksTotal: true,
          campaign: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              campaignType: true,
              status: true,
              rewardAmount: true,
              endAt: true,
              merchant: { select: { businessName: true } },
            },
          },
        },
      }),
      this.prisma.campaignParticipant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Rewards credited to one person, summed per campaign. Reversed rewards are not counted. */
  async sumCreditedRewards(userId: string, campaignIds: string[]): Promise<Map<string, number>> {
    if (!campaignIds.length) return new Map();
    const rows = await this.prisma.reward.groupBy({
      by: ['campaignId'],
      where: { userId, campaignId: { in: campaignIds }, status: 'CREDITED', deletedAt: null },
      _sum: { amount: true },
    });
    return new Map(rows.map((row) => [row.campaignId, Number(row._sum.amount ?? 0)]));
  }
}
