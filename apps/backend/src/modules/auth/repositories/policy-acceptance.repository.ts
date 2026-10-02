import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface PolicyAcceptanceInput {
  policy: PolicyType;
  version: string;
}

@Injectable()
export class PolicyAcceptanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every acceptance of one of the given versions by this user. */
  async findAccepted(userId: string, documents: readonly PolicyAcceptanceInput[]) {
    return this.prisma.policyAcceptance.findMany({
      where: { userId, OR: documents.map(({ policy, version }) => ({ policy, version })) },
      select: { policy: true, version: true, acceptedAt: true },
    });
  }

  /** Records acceptances. A version already accepted is skipped, so accepting twice keeps the first time it happened. */
  async createMany(userId: string, documents: readonly PolicyAcceptanceInput[], ipAddress?: string, userAgent?: string) {
    if (documents.length === 0) return { count: 0 };
    return this.prisma.policyAcceptance.createMany({
      data: documents.map(({ policy, version }) => ({
        userId,
        policy,
        version,
        ipAddress: ipAddress?.slice(0, 64),
        userAgent: userAgent?.slice(0, 512),
      })),
      skipDuplicates: true,
    });
  }
}
