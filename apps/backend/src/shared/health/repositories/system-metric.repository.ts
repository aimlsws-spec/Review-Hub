import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SystemMetricRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(metric: string, value: number, unit?: string) {
    return this.prisma.systemMetric.create({ data: { metric, value, unit } });
  }

  async findRecent(metric: string | undefined, page: number, limit: number) {
    const where: Prisma.SystemMetricWhereInput = { deletedAt: null };
    if (metric) where.metric = metric;

    const [data, total] = await Promise.all([
      this.prisma.systemMetric.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { timestamp: 'desc' } }),
      this.prisma.systemMetric.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
