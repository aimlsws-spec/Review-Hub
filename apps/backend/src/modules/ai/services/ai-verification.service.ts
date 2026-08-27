import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { SubmissionService } from '../../task/services';
import { AI_VERIFICATION_THRESHOLDS } from '../constants';
import { AiVerificationDecision, CompleteVerificationJobDto } from '../dto';
import { AiVerificationJobRepository } from '../repositories';

@Injectable()
export class AiVerificationService {
  private readonly logger = new Logger(AiVerificationService.name);

  constructor(
    private readonly jobRepository: AiVerificationJobRepository,
    private readonly submissionService: SubmissionService,
    private readonly storageService: LocalStorageService,
  ) {}

  /** Claims the oldest queued job, if any, for the calling worker to process. */
  async claimNextJob(engine: string, model?: string) {
    return this.jobRepository.claimNextQueued(engine, model);
  }

  /**
   * Resolves the absolute path to a job's submitted evidence file, so the
   * controller can stream it back to the AI worker. `uploads/submissions`
   * is deliberately excluded from `ServeStaticModule` (see app.module.ts),
   * so this authenticated, API-key-gated route is the only way to fetch it.
   */
  async getEvidenceFilePath(jobId: string): Promise<string> {
    const job = await this.jobRepository.findByIdWithSubmission(jobId);
    if (!job) throw new NotFoundException('AI verification job');
    if (!job.submission.fileUrl) throw new NotFoundException('Evidence file');

    const exists = await this.storageService.fileExists(job.submission.fileUrl);
    if (!exists) throw new NotFoundException('Evidence file');

    return this.storageService.getFilePath(job.submission.fileUrl);
  }

  /**
   * The worker reports its verdict here. Regardless of what the model
   * decided, the actual submission outcome (auto-approve/reject vs. escalate
   * to a human) is re-evaluated against fixed confidence/fraud thresholds —
   * a model that's unsure or flags meaningful fraud risk never gets to
   * unilaterally approve or reject a real reward payout.
   */
  async completeJob(jobId: string, dto: CompleteVerificationJobDto) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new NotFoundException('AI verification job');

    const fraudScore = dto.fraudScore ?? 0;

    await this.jobRepository.createAuditLog({
      job: { connect: { id: jobId } },
      confidence: dto.confidence,
      fraudScore,
      decision: dto.decision,
      explanation: dto.explanation,
      metadata: dto.rawResponse as Prisma.InputJsonValue | undefined,
    });

    await this.jobRepository.markCompleted(jobId, {
      rawResponse: dto.rawResponse as Prisma.InputJsonValue | undefined,
      processingTimeMs: dto.processingTimeMs ?? 0,
    });

    const clearsThreshold =
      dto.confidence >= AI_VERIFICATION_THRESHOLDS.MIN_CONFIDENCE &&
      fraudScore <= AI_VERIFICATION_THRESHOLDS.MAX_FRAUD_SCORE;

    if (!clearsThreshold || dto.decision === AiVerificationDecision.MANUAL_REVIEW) {
      await this.submissionService.deferToManualReview(job.submissionId);
      this.logger.log(`Submission ${job.submissionId} escalated to manual review (confidence=${dto.confidence}, fraud=${fraudScore})`);
      return { submissionId: job.submissionId, outcome: 'PENDING_MANUAL' as const };
    }

    if (dto.decision === AiVerificationDecision.APPROVE) {
      await this.submissionService.aiApprove(job.submissionId);
      return { submissionId: job.submissionId, outcome: 'APPROVED' as const };
    }

    await this.submissionService.aiReject(
      job.submissionId,
      dto.explanation ?? 'Automated verification could not confirm this submission.',
    );
    return { submissionId: job.submissionId, outcome: 'REJECTED' as const };
  }

  async markFailed(jobId: string, errorMessage: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new NotFoundException('AI verification job');

    await this.jobRepository.markFailed(jobId, errorMessage);
    await this.submissionService.deferToManualReview(job.submissionId);
    return { submissionId: job.submissionId, outcome: 'PENDING_MANUAL' as const };
  }
}
