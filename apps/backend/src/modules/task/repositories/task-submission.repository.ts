import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockCampaignParticipant } from '../../../database/prisma/row-lock';
import { BLOCKING_SUBMISSION_STATUSES, IN_FLIGHT_SUBMISSION_STATUSES } from '../constants';

/** A submission to create only if the task's completion limit (FR-016) still allows it. */
export interface LimitedSubmission {
  participantId: string;
  taskId: string;
  userId: string;
  /** How many counted submissions are allowed in the period. */
  maxCompletions: number;
  /** The current period, or null for a limit over the task's whole life (ONCE). */
  period: { start: Date; end: Date } | null;
  data: Prisma.TaskSubmissionCreateInput;
}

export type LimitedSubmissionResult =
  | { outcome: 'created'; submission: Prisma.TaskSubmissionGetPayload<object> }
  | { outcome: 'in-flight' }
  | { outcome: 'limit-reached' };

/** What a merchant reviewer sees with each submission. Only unresolved fraud flags: settled ones are history. */
const MERCHANT_REVIEW_INCLUDE = {
  task: {
    select: {
      id: true,
      title: true,
      taskType: true,
      proofType: true,
      verificationType: true,
      campaign: { select: { id: true, title: true } },
    },
  },
  user: { select: { firstName: true, lastName: true } },
  attachments: { select: { mimeType: true, fileName: true }, take: 1 },
  aiJob: { select: { status: true, auditLog: { select: { decision: true, confidence: true, fraudScore: true, explanation: true } } } },
  fraudFlags: { where: { resolved: false }, select: { type: true, riskLevel: true, reason: true } },
} satisfies Prisma.TaskSubmissionInclude;

@Injectable()
export class TaskSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskSubmissionCreateInput) {
    return this.prisma.taskSubmission.create({ data });
  }

  /**
   * Creates the submission only if nothing for this task is still being checked and the completion limit is not used
   * up. Both checks run under a lock on the participant row, so two submissions sent at the same moment are counted
   * one after the other instead of both passing.
   */
  async createWithinLimit(input: LimitedSubmission): Promise<LimitedSubmissionResult> {
    const { participantId, taskId, userId, maxCompletions, period, data } = input;
    return this.prisma.$transaction(async (tx) => {
      await lockCampaignParticipant(tx, participantId);

      const base: Prisma.TaskSubmissionWhereInput = { taskId, userId, deletedAt: null };
      const inFlight = await tx.taskSubmission.count({ where: { ...base, status: { in: [...IN_FLIGHT_SUBMISSION_STATUSES] } } });
      if (inFlight > 0) return { outcome: 'in-flight' };

      const counted = await tx.taskSubmission.count({
        where: {
          ...base,
          status: { in: [...BLOCKING_SUBMISSION_STATUSES] },
          ...(period ? { createdAt: { gte: period.start, lt: period.end } } : {}),
        },
      });
      if (counted >= maxCompletions) return { outcome: 'limit-reached' };

      return { outcome: 'created', submission: await tx.taskSubmission.create({ data }) };
    });
  }

  /**
   * One person's submissions that count towards the limits of the given tasks (in flight or approved), for working out
   * whether each task is still open to them (task-availability.ts).
   */
  async findOwnForTasks(userId: string, taskIds: string[]) {
    if (!taskIds.length) return [];
    return this.prisma.taskSubmission.findMany({
      where: { userId, taskId: { in: taskIds }, deletedAt: null, status: { in: [...BLOCKING_SUBMISSION_STATUSES] } },
      select: { taskId: true, status: true, createdAt: true },
    });
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

  /**
   * Submissions to one merchant's campaigns, newest first, with what a reviewer needs beside each: the task, the
   * campaign, who sent it, the evidence, the AI's verdict and any open fraud flags.
   */
  async findForMerchant(params: { merchantId: string; page: number; limit: number; status?: string; campaignId?: string }) {
    const { merchantId, page, limit, status, campaignId } = params;
    const where: Prisma.TaskSubmissionWhereInput = {
      deletedAt: null,
      task: { campaign: { merchantId, ...(campaignId ? { id: campaignId } : {}) } },
    };
    if (status) where.status = status as never;

    const [data, total] = await Promise.all([
      this.prisma.taskSubmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: MERCHANT_REVIEW_INCLUDE,
      }),
      this.prisma.taskSubmission.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** One submission, only if it belongs to one of this merchant's campaigns. */
  async findOneForMerchant(id: string, merchantId: string) {
    return this.prisma.taskSubmission.findFirst({
      where: { id, deletedAt: null, task: { campaign: { merchantId } } },
      include: MERCHANT_REVIEW_INCLUDE,
    });
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
