import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class DailyRewardPrizeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; isActive?: boolean }) {
    const { page, limit, isActive } = params;
    const where: Prisma.DailyRewardPrizeWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.dailyRewardPrize.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { amount: 'asc' } }),
      this.prisma.dailyRewardPrize.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.dailyRewardPrize.findFirst({ where: { id, deletedAt: null } });
  }

  async findAllActive() {
    return this.prisma.dailyRewardPrize.findMany({ where: { deletedAt: null, isActive: true } });
  }

  async create(data: Prisma.DailyRewardPrizeCreateInput) {
    return this.prisma.dailyRewardPrize.create({ data });
  }

  async update(id: string, data: Prisma.DailyRewardPrizeUpdateInput) {
    return this.prisma.dailyRewardPrize.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.dailyRewardPrize.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
