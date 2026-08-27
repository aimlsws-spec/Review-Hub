import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AiVerificationJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.aIVerificationJob.findUnique({ where: { id } });
  }

  async findByIdWithSubmission(id: string) {
    return this.prisma.aIVerificationJob.findUnique({ where: { id }, include: { submission: true } });
  }

  /**
   * Atomically claims the oldest QUEUED job by flipping it to PROCESSING in
   * one conditional update — `updateMany`'s `where: { status: 'QUEUED' }`
   * only succeeds if no other worker claimed it first, so two concurrent
   * pollers can never process the same job.
   */
  async claimNextQueued(engine: string, model?: string) {
    const next = await this.prisma.aIVerificationJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) return null;

    const claim = await this.prisma.aIVerificationJob.updateMany({
      where: { id: next.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', startedAt: new Date(), engine, model },
    });
    if (claim.count === 0) return null; // Lost the race to another worker.

    return this.prisma.aIVerificationJob.findUnique({
      where: { id: next.id },
      include: { submission: { include: { task: { select: { taskType: true } } } } },
    });
  }

  async markCompleted(id: string, data: { rawResponse?: Prisma.InputJsonValue; processingTimeMs: number }) {
    return this.prisma.aIVerificationJob.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), ...data },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.aIVerificationJob.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage, retries: { increment: 1 } },
    });
  }

  async createAuditLog(data: Prisma.AIAuditLogCreateInput) {
    return this.prisma.aIAuditLog.create({ data });
  }
}
