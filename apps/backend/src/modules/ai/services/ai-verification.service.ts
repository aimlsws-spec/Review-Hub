import { Injectable, Logger } from '@nestjs/common';
import { FraudRiskLevel, Prisma } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AI_CALL_FEATURES, AiCallLogService } from '../../../shared/ai-call-log';
import { LocalStorageService } from '../../../storage/storage.service';
import { FraudFlagRepository } from '../../admin/repositories';
import { DuplicateImageService } from '../../risk/services';
import { SubmissionService } from '../../task/services';
import { AI_VERIFICATION_THRESHOLDS } from '../constants';
import { CompleteVerificationJobDto } from '../dto';
import { AiVerificationJobRepository } from '../repositories';

@Injectable()
export class AiVerificationService {
  private readonly logger = new Logger(AiVerificationService.name);

  constructor(
    private readonly jobRepository: AiVerificationJobRepository,
    private readonly submissionService: SubmissionService,
    private readonly storageService: LocalStorageService,
    private readonly fraudFlagRepository: FraudFlagRepository,
    private readonly duplicateImageService: DuplicateImageService,
    private readonly aiCallLog: AiCallLogService,
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
   * The worker reports its verdict here. The AI only advises: whatever it decided, the submission then waits for the
   * merchant (or an admin) to approve or reject it, so no reward is ever paid without a person deciding.
   *
   * WHY: the AI can spot a re-used, blank or unreadable screenshot, but it can not confirm the proof really shows this
   * merchant's business, and a wrong rejection is unfair to someone who did the work. Its verdict, confidence and
   * explanation are kept (the audit log below) and shown to the reviewer next to any fraud flags.
   */
  async completeJob(jobId: string, dto: CompleteVerificationJobDto) {
    const job = await this.jobRepository.findByIdWithSubmission(jobId);
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
    void this.aiCallLog.record({
      feature: AI_CALL_FEATURES.SUBMISSION_VERIFICATION,
      status: 'SUCCESS',
      latencyMs: dto.processingTimeMs ?? this.elapsedSince(job.startedAt),
      output: { decision: dto.decision, explanation: dto.explanation },
      model: [job.engine, job.model].filter(Boolean).join('/') || null,
      confidence: dto.confidence,
      submissionId: job.submissionId,
    });

    if (fraudScore > AI_VERIFICATION_THRESHOLDS.MAX_FRAUD_SCORE) {
      await this.flagFraudRisk(job.submissionId, job.submission.userId, fraudScore, dto.explanation);
    }

    // A re-used picture is flagged for the reviewer to see; the decision is theirs either way.
    await this.checkForDuplicateImage(job.submissionId, job.submission.userId, dto);

    await this.submissionService.deferToManualReview(job.submissionId);
    this.logger.log(
      `Submission ${job.submissionId} checked by the AI (${dto.decision}, confidence=${dto.confidence}, fraud=${fraudScore}); waiting for a person to decide`,
    );
    return { submissionId: job.submissionId, outcome: 'PENDING_MANUAL' as const };
  }

  /** Fingerprints the evidence picture and flags it if it matches an earlier one. A failure only costs that flag. */
  private async checkForDuplicateImage(submissionId: string, userId: string, dto: CompleteVerificationJobDto): Promise<void> {
    if (!dto.perceptualHash) return;

    try {
      await this.duplicateImageService.check({ submissionId, userId, perceptualHash: dto.perceptualHash, evidenceText: dto.evidenceText });
    } catch (error) {
      this.logger.error(`Duplicate-image check failed for submission ${submissionId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private elapsedSince(startedAt: Date | null | undefined): number {
    return startedAt ? Date.now() - startedAt.getTime() : 0;
  }

  async markFailed(jobId: string, errorMessage: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new NotFoundException('AI verification job');

    await this.jobRepository.markFailed(jobId, errorMessage);
    void this.aiCallLog.record({
      feature: AI_CALL_FEATURES.SUBMISSION_VERIFICATION,
      status: 'FAILED',
      latencyMs: this.elapsedSince(job.startedAt),
      model: [job.engine, job.model].filter(Boolean).join('/') || null,
      submissionId: job.submissionId,
    });
    await this.submissionService.deferToManualReview(job.submissionId);
    return { submissionId: job.submissionId, outcome: 'PENDING_MANUAL' as const };
  }

  /**
   * Raises an admin-visible fraud flag whenever the AI's fraud score crosses MAX_FRAUD_SCORE. The reviewer sees it
   * before deciding, and admins can act on it with `FraudReviewService.reverseReward` if the submission was approved
   * and rewarded anyway.
   */
  private async flagFraudRisk(submissionId: string, userId: string, fraudScore: number, explanation?: string) {
    const riskLevel: FraudRiskLevel = fraudScore >= 0.8 ? 'CRITICAL' : fraudScore >= 0.6 ? 'HIGH' : 'MEDIUM';

    await this.fraudFlagRepository.create({
      submission: { connect: { id: submissionId } },
      user: { connect: { id: userId } },
      riskLevel,
      reason: explanation ?? `AI verification computed a fraud score of ${fraudScore.toFixed(2)}, above the ${AI_VERIFICATION_THRESHOLDS.MAX_FRAUD_SCORE} threshold.`,
      metadata: { fraudScore },
    });

    this.logger.warn(`Fraud flag raised for submission ${submissionId} (fraudScore=${fraudScore})`);
  }
}
