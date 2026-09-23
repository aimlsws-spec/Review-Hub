import { createHash } from 'crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { LocalStorageService } from '../../../storage/storage.service';
import { REVIEW_DRAFT_SUPPORTED_TASK_TYPES, TEXT_ASSIST_SUPPORTED_TASK_TYPES } from '../../ai/constants';
import { DraftReviewDto } from '../../ai/dto';
import { AiAssistService } from '../../ai/services/ai-assist.service';
import { CampaignRepository } from '../../campaign/repositories';
import { MerchantRepository } from '../../merchant/repositories';
import { SubmissionRiskService } from '../../risk/services';
import { BLOCKING_SUBMISSION_STATUSES, SUBMISSION_STORAGE } from '../constants';
import { SubmitTaskDto } from '../dto';
import { TaskStartedEvent, TaskSubmittedEvent } from '../events';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

import { LocationCheckinVerificationService } from './location-checkin-verification.service';
import { QrScanVerificationService } from './qr-scan-verification.service';
import { SubmissionService } from './submission.service';

/** Verified by a deterministic rule instead of the AI/manual review pipeline — see submitDeterministicTask. */
const DETERMINISTIC_TASK_TYPES = ['QR_SCAN', 'LOCATION_CHECKIN'] as const;



/**
 * Handles a user joining a campaign through its first task, and submitting
 * evidence for a task. Every submission lands at PENDING with a QUEUED
 * AIVerificationJob row; the AI service (apps/ai-services) claims it,
 * moves the submission through AI_PROCESSING, and either auto-decides it
 * or defers to PENDING_MANUAL for a human reviewer.
 */
@Injectable()
export class TaskParticipationService {
  private readonly logger = new Logger(TaskParticipationService.name);

  constructor(
    private readonly campaignTaskRepository: CampaignTaskRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly participantRepository: CampaignParticipantRepository,
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly storageService: LocalStorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiAssistService: AiAssistService,
    private readonly merchantRepository: MerchantRepository,
    private readonly submissionRisk: SubmissionRiskService,
    private readonly submissionService: SubmissionService,
    private readonly qrScanVerification: QrScanVerificationService,
    private readonly locationCheckinVerification: LocationCheckinVerificationService,
    @InjectQueue(QUEUE_NAMES.AI_VERIFICATION) private readonly aiQueue: Queue,
  ) {}

  async startTask(taskId: string, userId: string) {
    const { task, campaign } = await this.getActiveTask(taskId);

    let participant = await this.participantRepository.findByCampaignAndUser(campaign.id, userId);
    if (!participant) {
      const tasksTotal = await this.campaignTaskRepository.countActiveByCampaignId(campaign.id);
      participant = await this.participantRepository.create({
        campaign: { connect: { id: campaign.id } },
        user: { connect: { id: userId } },
        status: 'IN_PROGRESS',
        tasksTotal,
      });
    } else if (['DISQUALIFIED', 'ABANDONED'].includes(participant.status)) {
      throw new BadRequestException(`Cannot continue: participation is ${participant.status.toLowerCase()}`);
    }

    this.eventEmitter.emit('task.started', new TaskStartedEvent(task.id, campaign.id, userId, participant.id));

    return { task, participant };
  }

  /** Drafts suggested text (review/caption) for tasks where that's meaningful — never for e.g. a follow/install task. */
  async suggestText(taskId: string) {
    const { task, campaign } = await this.getActiveTask(taskId);

    if (!TEXT_ASSIST_SUPPORTED_TASK_TYPES.includes(task.taskType as (typeof TEXT_ASSIST_SUPPORTED_TASK_TYPES)[number])) {
      throw new BadRequestException(`Text suggestions aren't available for ${task.taskType} tasks`);
    }

    return this.aiAssistService.suggestText({
      taskType: task.taskType,
      campaignTitle: campaign.title,
      campaignDescription: campaign.description,
      taskTitle: task.title,
      taskInstructions: task.instructions ?? undefined,
    });
  }

  /**
   * The guided review assistant — drafts several editable review options
   * from what the user says they liked. Reviews are about the *business*,
   * not the campaign's promotional name, so this resolves the merchant
   * separately rather than reusing campaign.title.
   */
  async draftReviews(taskId: string, dto: DraftReviewDto) {
    const { task, campaign } = await this.getActiveTask(taskId);

    if (!REVIEW_DRAFT_SUPPORTED_TASK_TYPES.includes(task.taskType as (typeof REVIEW_DRAFT_SUPPORTED_TASK_TYPES)[number])) {
      throw new BadRequestException(`Review drafts aren't available for ${task.taskType} tasks`);
    }

    const merchant = await this.merchantRepository.findById(campaign.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    return this.aiAssistService.draftReviews({
      businessName: merchant.businessName,
      likedAspects: dto.likedAspects,
      improveAspects: dto.improveAspects,
      experience: dto.experience,
      wouldRecommend: dto.wouldRecommend,
      notes: dto.notes,
    });
  }

  /** Captions have no compliance restriction to a task type — any active task's campaign can generate one. */
  async generateCaptions(taskId: string) {
    const { campaign } = await this.getActiveTask(taskId);

    return this.aiAssistService.generateCaptions({
      campaignTitle: campaign.title,
      campaignDescription: campaign.description,
    });
  }

  async submitTask(taskId: string, userId: string, dto: SubmitTaskDto, file?: Express.Multer.File, context: { ip?: string } = {}) {
    const { task, campaign } = await this.getActiveTask(taskId);

    const participant = await this.participantRepository.findByCampaignAndUser(campaign.id, userId);
    if (!participant) {
      throw new BadRequestException('Start the task before submitting evidence');
    }

    const latestAttempt = await this.submissionRepository.findLatestAttempt(participant.id, taskId);
    if (latestAttempt && BLOCKING_SUBMISSION_STATUSES.includes(latestAttempt.status)) {
      throw new BadRequestException(`This task already has a submission in ${latestAttempt.status} status`);
    }

    if (DETERMINISTIC_TASK_TYPES.includes(task.taskType as (typeof DETERMINISTIC_TASK_TYPES)[number])) {
      return this.submitDeterministicTask(task, campaign, participant.id, latestAttempt, userId, dto, context);
    }

    if (task.proofRequired && !file && !dto.externalUrl && !dto.textAnswer) {
      throw new BadRequestException('This task requires evidence: upload a file, a link, or a written answer');
    }

    let fileUrl: string | undefined;
    let checksum: string | undefined;
    let fraudMatch: Awaited<ReturnType<TaskSubmissionRepository['findAttachmentByChecksum']>> = null;

    if (file) {
      this.assertValidFile(file);
      checksum = createHash('sha256').update(file.buffer).digest('hex');
      fraudMatch = await this.submissionRepository.findAttachmentByChecksum(checksum);

      const upload = await this.storageService.saveFile(
        file.buffer,
        file.originalname,
        `${SUBMISSION_STORAGE.FOLDER}/${campaign.id}/${taskId}`,
      );
      fileUrl = upload.path;
    }

    const submission = await this.submissionRepository.create({
      participant: { connect: { id: participant.id } },
      task: { connect: { id: taskId } },
      user: { connect: { id: userId } },
      status: 'PENDING',
      verificationSource: 'AI',
      attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
      fileUrl,
      externalUrl: dto.externalUrl,
      textAnswer: dto.textAnswer,
    });

    if (file && fileUrl && checksum) {
      await this.submissionRepository.createAttachment({
        submission: { connect: { id: submission.id } },
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: fileUrl,
        checksum,
      });
    }

    await this.submissionRepository.createVerificationJob({
      submission: { connect: { id: submission.id } },
      status: 'QUEUED',
    });

    if (fraudMatch && fraudMatch.submission.userId !== userId) {
      await this.submissionRepository.createFraudFlag({
        submission: { connect: { id: submission.id } },
        user: { connect: { id: userId } },
        type: 'DUPLICATE_SUBMISSION',
        riskLevel: 'HIGH',
        reason: 'Uploaded evidence matches a file already submitted by a different user',
        metadata: { kind: 'exact', matchedSubmissionId: fraudMatch.submissionId, matchedUserId: fraudMatch.submission.userId },
      });
    } else if (fraudMatch) {
      await this.submissionRepository.createFraudFlag({
        submission: { connect: { id: submission.id } },
        user: { connect: { id: userId } },
        type: 'DUPLICATE_SUBMISSION',
        riskLevel: 'LOW',
        reason: 'Uploaded evidence matches a file this user submitted before',
        metadata: { kind: 'exact', matchedSubmissionId: fraudMatch.submissionId, matchedUserId: fraudMatch.submission.userId },
      });
    }

    // Look at where the submission came from and whether the same person is working this campaign from several
    // accounts. Findings are only flags for reviewers, so a failure here must never stop the submission.
    try {
      await this.submissionRisk.assess({ submissionId: submission.id, userId, campaignId: campaign.id, ip: context.ip });
    } catch (error) {
      this.logger.error(`Risk check failed for submission ${submission.id}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 1) Push to the background BullMQ Queue for AI Processing
    await this.aiQueue.add('verify-submission', {
      submissionId: submission.id,
      taskId,
      campaignId: campaign.id,
      userId,
    });

    // 2) Emit event for local listeners (if any)
    this.eventEmitter.emit('task.submitted', new TaskSubmittedEvent(submission.id, taskId, campaign.id, userId));

    return this.submissionRepository.findById(submission.id);
  }

  /**
   * QR_SCAN and LOCATION_CHECKIN don't need the AI service or a human reviewer — the check is a deterministic rule
   * against `task.configuration`, so the decision (and any reward) lands the moment the submission is created.
   */
  private async submitDeterministicTask(
    task: Awaited<ReturnType<CampaignTaskRepository['findById']>> & object,
    campaign: Awaited<ReturnType<CampaignRepository['findById']>> & object,
    participantId: string,
    latestAttempt: Awaited<ReturnType<TaskSubmissionRepository['findLatestAttempt']>>,
    userId: string,
    dto: SubmitTaskDto,
    context: { ip?: string },
  ) {
    const submission = await this.submissionRepository.create({
      participant: { connect: { id: participantId } },
      task: { connect: { id: task.id } },
      user: { connect: { id: userId } },
      status: 'PENDING',
      verificationSource: 'SYSTEM',
      attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
      textAnswer: dto.textAnswer,
      metadata: dto.latitude !== undefined && dto.longitude !== undefined ? { latitude: dto.latitude, longitude: dto.longitude } : undefined,
    });

    // Same as the AI-queued path: a failure here must never stop the submission, only skip its flags.
    try {
      await this.submissionRisk.assess({ submissionId: submission.id, userId, campaignId: campaign.id, ip: context.ip });
    } catch (error) {
      this.logger.error(`Risk check failed for submission ${submission.id}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const submittedLocation =
      dto.latitude !== undefined && dto.longitude !== undefined ? { latitude: dto.latitude, longitude: dto.longitude } : null;

    const verdict =
      task.taskType === 'QR_SCAN'
        ? this.qrScanVerification.verify(task.configuration, dto.textAnswer)
        : this.locationCheckinVerification.verify(task.configuration, submittedLocation);

    if (verdict.passed) {
      await this.submissionService.aiApprove(submission.id);
    } else {
      await this.submissionService.aiReject(submission.id, verdict.reason ?? 'Verification failed');
    }

    this.eventEmitter.emit('task.submitted', new TaskSubmittedEvent(submission.id, task.id, campaign.id, userId));

    return this.submissionRepository.findById(submission.id);
  }

  private async getActiveTask(taskId: string) {
    const task = await this.campaignTaskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task');

    const campaign = await this.campaignRepository.findById(task.campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    if (campaign.status !== 'ACTIVE') {
      throw new BadRequestException('This campaign is not currently active');
    }

    return { task, campaign };
  }

  private assertValidFile(file: Express.Multer.File) {
    const allowedMimeTypes: readonly string[] = SUBMISSION_STORAGE.ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type for task evidence');
    }
    if (file.size > SUBMISSION_STORAGE.MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum 20MB');
    }
  }
}
