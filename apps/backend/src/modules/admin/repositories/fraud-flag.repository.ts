import { Injectable } from '@nestjs/common';
import { FraudRiskLevel, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class FraudFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; resolved?: boolean; riskLevel?: FraudRiskLevel }) {
    const { page, limit, resolved, riskLevel } = params;
    const where: Prisma.SubmissionFraudFlagWhereInput = {};
    if (resolved !== undefined) where.resolved = resolved;
    if (riskLevel) where.riskLevel = riskLevel;

    const [data, total] = await Promise.all([
      this.prisma.submissionFraudFlag.findMany({
        where,
        include: { submission: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.submissionFraudFlag.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.submissionFraudFlag.findUnique({
      where: { id },
      include: { submission: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async resolve(id: string, resolvedBy: string) {
    return this.prisma.submissionFraudFlag.update({
      where: { id },
      data: { resolved: true, resolvedBy, resolvedAt: new Date() },
    });
  }
}
