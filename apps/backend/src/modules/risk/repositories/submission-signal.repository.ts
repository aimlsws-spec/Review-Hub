import { Injectable } from '@nestjs/common';
import { FraudFlagType, FraudRiskLevel, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BLOCKING_FLAG_LEVELS } from '../constants';

/** Reads and writes the fraud flags attached to a submission, which is where every risk signal ends up. */
@Injectable()
export class SubmissionSignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFlag(data: {
    submissionId: string;
    userId: string;
    type: FraudFlagType;
    riskLevel: FraudRiskLevel;
    reason: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.submissionFraudFlag.create({
      data: {
        submission: { connect: { id: data.submissionId } },
        user: { connect: { id: data.userId } },
        type: data.type,
        riskLevel: data.riskLevel,
        reason: data.reason,
        metadata: data.metadata,
      },
    });
  }

  /** True if this submission already has a flag of this type pointing at the same other submission. */
  async hasFlagAbout(submissionId: string, type: FraudFlagType, matchedSubmissionId: string): Promise<boolean> {
    const count = await this.prisma.submissionFraudFlag.count({
      where: { submissionId, type, metadata: { path: '$.matchedSubmissionId', equals: matchedSubmissionId } },
    });
    return count > 0;
  }

  /** True if anything serious and still open is flagged on this submission, which means a person must look before it is paid. */
  async hasUnresolvedBlockingFlag(submissionId: string): Promise<boolean> {
    const count = await this.prisma.submissionFraudFlag.count({
      where: { submissionId, resolved: false, riskLevel: { in: BLOCKING_FLAG_LEVELS } },
    });
    return count > 0;
  }
}
