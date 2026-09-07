import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class JobExecutionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.JobExecutionLogCreateInput) {
    return this.prisma.jobExecutionLog.create({ data });
  }

  async findByJob(jobId: string, page: number, limit: number) {
    const where: Prisma.JobExecutionLogWhereInput = { jobId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.jobExecutionLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.jobExecutionLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
