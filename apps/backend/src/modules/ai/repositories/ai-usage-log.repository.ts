import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AiUsageLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(providerId: string, page: number, limit: number) {
    const where: Prisma.AIUsageLogWhereInput = { providerId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.aIUsageLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.aIUsageLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(data: Prisma.AIUsageLogCreateInput) {
    return this.prisma.aIUsageLog.create({ data });
  }
}
