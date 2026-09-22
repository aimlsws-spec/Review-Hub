import * as fs from 'fs';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Job } from 'bullmq';
import * as FormData from 'form-data';

import { AiVerificationJobRepository } from '../../modules/ai/repositories/ai-verification-job.repository';
import { AiVerificationService } from '../../modules/ai/services/ai-verification.service';
import { TaskSubmissionRepository } from '../../modules/task/repositories/task-submission.repository';
import { QUEUE_NAMES } from '../../queues/queue.constants';

interface VerifySubmissionJobData {
  submissionId: string;
  taskId: string;
  campaignId: string;
  userId: string;
}

@Injectable()
@Processor(QUEUE_NAMES.AI_VERIFICATION)
export class AiVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiVerificationProcessor.name);

  constructor(
    private readonly aiVerificationService: AiVerificationService,
    private readonly jobRepository: AiVerificationJobRepository,
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<VerifySubmissionJobData>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`Processing AI verification for submission ${submissionId}`);

    try {
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      // Fetch file path if there's a file
      let filePath: string | null = null;
      if (submission.fileUrl) {
        try {
          filePath = await this.aiVerificationService.getEvidenceFilePath(submission.id);
        } catch (err) {
          this.logger.warn(`Evidence file not found for submission ${submissionId}`);
        }
      }

      const aiServiceUrl = this.configService.get<string>('ai.serviceUrl', 'http://localhost:8000');
      const apiKey = this.configService.get<string>('ai.apiKey', '');
      const apiSecret = this.configService.get<string>('ai.apiSecret', '');

      const form = new FormData();
      form.append('submissionJson', JSON.stringify({
        id: submission.id,
        taskId: submission.taskId,
        userId: submission.userId,
        fileUrl: submission.fileUrl,
        externalUrl: submission.externalUrl,
        textAnswer: submission.textAnswer,
        submittedAt: submission.createdAt.toISOString(),
      }));

      if (filePath && fs.existsSync(filePath)) {
        form.append('file', fs.createReadStream(filePath));
      }

      const start = Date.now();
      const response = await axios.post(`${aiServiceUrl}/v1/verify`, form, {
        headers: {
          ...form.getHeaders(),
          'X-Api-Key': apiKey,
          'X-Api-Secret': apiSecret,
        },
      });

      const outcome = response.data;
      const processingTimeMs = Date.now() - start;

      this.logger.log(`Received outcome for submission ${submissionId}: ${outcome.decision}`);

      const activeDbJob = await this.jobRepository.findActiveBySubmissionId(submissionId);
      
      if (activeDbJob) {
        await this.aiVerificationService.completeJob(activeDbJob.id, {
          decision: outcome.decision,
          confidence: outcome.confidence,
          fraudScore: outcome.fraudScore,
          explanation: outcome.explanation,
          rawResponse: outcome.rawResponse,
          // null when the evidence is not an image; the DTO treats a missing value as "no fingerprint".
          perceptualHash: outcome.perceptualHash ?? undefined,
          evidenceText: outcome.evidenceText ?? undefined,
          processingTimeMs,
          engine: 'FastAPI Verification Engine',
        });
      } else {
        this.logger.warn(`No active DB verification job found for submission ${submissionId}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify submission ${submissionId}: ${message}`);
      
      const activeDbJob = await this.jobRepository.findActiveBySubmissionId(submissionId);
      if (activeDbJob) {
        await this.aiVerificationService.markFailed(activeDbJob.id, message);
      }
      throw error;
    }
  }
}
