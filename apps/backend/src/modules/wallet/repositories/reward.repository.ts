import { Injectable } from '@nestjs/common';
import { Prisma, TaskType } from '@prisma/client';

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

  async markReversed(id: string, data: { reversedAmount: number; shortfallAmount: number; reversalReason: string; reversedBy: string }) {
    return this.prisma.reward.update({
      where: { id },
      data: {
        status: 'REVERSED',
        reversedAmount: data.reversedAmount,
        shortfallAmount: data.shortfallAmount,
        reversalReason: data.reversalReason,
        reversedBy: data.reversedBy,
        reversedAt: new Date(),
      },
    });
  }

  /** Credited rewards for tasks of the given types, e.g. review tasks for the "100 reviews" badge. */
  async countCreditedForTaskTypes(userId: string, taskTypes: TaskType[]) {
    return this.prisma.reward.count({ where: { userId, status: 'CREDITED', submission: { task: { taskType: { in: taskTypes } } } } });
  }

  /**
   * Users ranked by task rewards credited in [start, end), highest first. Rewards later clawed back are REVERSED and
   * so drop out. `take` is generous so the caller can still fill its list after leaving some people out.
   */
  async topEarnersBetween(start: Date, end: Date, take: number): Promise<Array<{ userId: string; amount: number }>> {
    const rows = await this.prisma.reward.groupBy({
      by: ['userId'],
      where: { status: 'CREDITED', creditedAt: { gte: start, lt: end }, deletedAt: null },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take,
    });
    return rows.map((row) => ({ userId: row.userId, amount: Number(row._sum.amount ?? 0) }));
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
