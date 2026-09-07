import { Injectable } from '@nestjs/common';
import { HealthStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class HealthCheckRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(service: string, status: HealthStatus, latency: number) {
    return this.prisma.healthCheck.create({ data: { service, status, latency } });
  }

  async findRecent(service: string | undefined, page: number, limit: number) {
    const where: Prisma.HealthCheckWhereInput = { deletedAt: null };
    if (service) where.service = service;

    const [data, total] = await Promise.all([
      this.prisma.healthCheck.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { checkedAt: 'desc' } }),
      this.prisma.healthCheck.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
