import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class DailyAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDateRange(from: Date, to: Date) {
    return this.prisma.dailyAnalytics.findMany({
      where: { date: { gte: from, lte: to }, deletedAt: null },
      orderBy: { date: 'asc' },
    });
  }

  async findByDate(date: Date) {
    return this.prisma.dailyAnalytics.findUnique({ where: { date } });
  }

  async upsertForDate(date: Date, data: Prisma.DailyAnalyticsUpdateInput & Prisma.DailyAnalyticsCreateInput) {
    return this.prisma.dailyAnalytics.upsert({
      where: { date },
      create: { ...data, date },
      update: data,
    });
  }
}
