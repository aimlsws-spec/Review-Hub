import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class RewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RewardCreateInput) {
    return this.prisma.reward.create({ data });
  }

  async findBySubmissionId(submissionId: string) {
    return this.prisma.reward.findUnique({ where: { submissionId } });
  }

  async markCredited(id: string) {
    return this.prisma.reward.update({
      where: { id },
      data: { status: 'CREDITED', creditedAt: new Date() },
    });
  }

  async countCreditedByUser(userId: string) {
    return this.prisma.reward.count({ where: { userId, status: 'CREDITED' } });
  }

  async findByUser(params: { userId: string; page: number; limit: number; status?: string }) {
    const { userId, page, limit, status } = params;
    const where: Prisma.RewardWhereInput = { userId, deletedAt: null };
    if (status) where.status = status as never;

    const [data, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findByMerchant(params: { merchantId: string; page: number; limit: number }) {
    const { merchantId, page, limit } = params;
    const where: Prisma.RewardWhereInput = { campaign: { merchantId }, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          campaign: { select: { id: true, title: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
