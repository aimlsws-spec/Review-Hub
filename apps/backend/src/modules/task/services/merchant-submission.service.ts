import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { MerchantSubmissionQueryDto, RejectSubmissionDto } from '../dto';
import { TaskSubmissionRepository } from '../repositories';

import { SubmissionService } from './submission.service';

type ReviewRow = NonNullable<Awaited<ReturnType<TaskSubmissionRepository['findOneForMerchant']>>>;

/** One submission as a merchant reviewer sees it. */
export interface MerchantSubmissionView {
  id: string;
  status: string;
  verificationSource: string;
  attemptNumber: number;
  createdAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  rewardAmount: number | null;
  campaign: { id: string; title: string };
  task: { id: string; title: string; taskType: string; proofType: string | null; verificationType: string };
  /** First name and last initial: enough to recognise a regular, without handing the merchant a full identity. */
  participantName: string;
  evidence: { file: { mimeType: string; fileName: string } | null; link: string | null };
  ai: { status: string; decision: string | null; confidence: number | null; fraudScore: number | null; explanation: string | null } | null;
  flags: { type: string | null; riskLevel: string; reason: string }[];
}

/**
 * The merchant's side of task review: the submissions to their own campaigns, the evidence, and the decision.
 * A decision goes through SubmissionService exactly as an admin's does, so the reward, the participant's progress and
 * the audit trail are the same; only the actor is recorded as the merchant. A submission to another merchant's
 * campaign is "not found", so ids can not be used to look at someone else's.
 */
@Injectable()
export class MerchantSubmissionService {
  constructor(
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly submissionService: SubmissionService,
    private readonly storageService: LocalStorageService,
  ) {}

  async list(merchantId: string, query: MerchantSubmissionQueryDto) {
    const result = await this.submissionRepository.findForMerchant({
      merchantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      campaignId: query.campaignId,
    });
    return { ...result, data: result.data.map(toView) };
  }

  async get(merchantId: string, submissionId: string): Promise<MerchantSubmissionView> {
    return toView(await this.getOwned(merchantId, submissionId));
  }

  /** Where the evidence file is on disk, for the controller to stream. */
  async getEvidenceFilePath(merchantId: string, submissionId: string): Promise<string> {
    const submission = await this.getOwned(merchantId, submissionId);
    if (!submission.fileUrl || !(await this.storageService.fileExists(submission.fileUrl))) {
      throw new NotFoundException('Evidence file');
    }
    return this.storageService.getFilePath(submission.fileUrl);
  }

  async approve(merchantId: string, submissionId: string, reviewerId: string) {
    await this.getOwned(merchantId, submissionId);
    await this.submissionService.approve(submissionId, reviewerId, 'MERCHANT');
    return this.get(merchantId, submissionId);
  }

  async reject(merchantId: string, submissionId: string, reviewerId: string, dto: RejectSubmissionDto) {
    await this.getOwned(merchantId, submissionId);
    await this.submissionService.reject(submissionId, reviewerId, dto, 'MERCHANT');
    return this.get(merchantId, submissionId);
  }

  private async getOwned(merchantId: string, submissionId: string): Promise<ReviewRow> {
    const submission = await this.submissionRepository.findOneForMerchant(submissionId, merchantId);
    if (!submission) throw new NotFoundException('Submission');
    return submission;
  }
}

function toView(row: ReviewRow): MerchantSubmissionView {
  const verdict = row.aiJob?.auditLog ?? null;
  return {
    id: row.id,
    status: row.status,
    verificationSource: row.verificationSource,
    attemptNumber: row.attemptNumber,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    rewardAmount: row.rewardAmount === null ? null : Number(row.rewardAmount),
    campaign: { id: row.task.campaign.id, title: row.task.campaign.title },
    task: {
      id: row.task.id,
      title: row.task.title,
      taskType: row.task.taskType,
      proofType: row.task.proofType,
      verificationType: row.task.verificationType,
    },
    participantName: [row.user.firstName, row.user.lastName ? `${row.user.lastName.charAt(0)}.` : ''].filter(Boolean).join(' '),
    evidence: { file: row.attachments[0] ?? (row.fileUrl ? { mimeType: 'application/octet-stream', fileName: 'evidence' } : null), link: row.externalUrl },
    ai: row.aiJob
      ? {
          status: row.aiJob.status,
          decision: verdict?.decision ?? null,
          confidence: verdict?.confidence ?? null,
          fraudScore: verdict?.fraudScore ?? null,
          explanation: verdict?.explanation ?? null,
        }
      : null,
    flags: row.fraudFlags.map((flag) => ({ type: flag.type, riskLevel: flag.riskLevel, reason: flag.reason })),
  };
}
