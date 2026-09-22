import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class TaskSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskSubmissionCreateInput) {
    return this.prisma.taskSubmission.create({ data });
  }

  async findById(id: string) {
    return this.prisma.taskSubmission.findFirst({
      where: { id, deletedAt: null },
      include: { attachments: true, aiJob: true, fraudFlags: true },
    });
  }

  async update(id: string, data: Prisma.TaskSubmissionUpdateInput) {
    return this.prisma.taskSubmission.update({ where: { id }, data });
  }

  /**
   * Changes a submission only if it is still in one of the given statuses, in one step, and says whether it did.
   *
   * WHY: a decision is read (is it still open?) and then written. Between the two, the automatic check and a reviewer
   * can both find it open, and the one that writes last silently undoes the other: a reviewer's approval, already paid
   * out, flipped back to "waiting for review". Putting the status in the write itself lets only one of them win.
   */
  async updateIfStatusIn(id: string, statuses: string[], data: Prisma.TaskSubmissionUncheckedUpdateManyInput): Promise<boolean> {
    const result = await this.prisma.taskSubmission.updateMany({
      where: { id, deletedAt: null, status: { in: statuses as never[] } },
      data,
    });
    return result.count === 1;
  }

  async findLatestAttempt(participantId: string, taskId: string) {
    return this.prisma.taskSubmission.findFirst({
      where: { participantId, taskId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  async findByUser(params: { userId: string; page: number; limit: number; status?: string }) {
    const { userId, page, limit, status } = params;
    const where: Prisma.TaskSubmissionWhereInput = { userId, deletedAt: null };
    if (status) where.status = status as never;

    const [data, total] = await Promise.all([
      this.prisma.taskSubmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { attachments: true },
      }),
      this.prisma.taskSubmission.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createAttachment(data: Prisma.SubmissionAttachmentCreateInput) {
    return this.prisma.submissionAttachment.create({ data });
  }

  async findAttachmentByChecksum(checksum: string) {
    return this.prisma.submissionAttachment.findFirst({
      where: { checksum },
      include: { submission: true },
    });
  }

  async createVerificationJob(data: Prisma.AIVerificationJobCreateInput) {
    return this.prisma.aIVerificationJob.create({ data });
  }

  async createFraudFlag(data: Prisma.SubmissionFraudFlagCreateInput) {
    return this.prisma.submissionFraudFlag.create({ data });
  }
}
