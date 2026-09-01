import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class DailyRewardClaimRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUserToday(userId: string) {
    return this.prisma.dailyRewardClaim.findUnique({
      where: { userId_claimDate: { userId, claimDate: startOfUtcDay(new Date()) } },
    });
  }

  async create(params: { userId: string; prizeId: string; rewardAmount: number }) {
    return this.prisma.dailyRewardClaim.create({
      data: {
        user: { connect: { id: params.userId } },
        prize: { connect: { id: params.prizeId } },
        claimDate: startOfUtcDay(new Date()),
        rewardAmount: params.rewardAmount,
      },
    });
  }
}
