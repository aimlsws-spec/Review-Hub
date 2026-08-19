import { createHash } from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LocalStorageService } from '../../../storage/storage.service';
import { CampaignRepository } from '../../campaign/repositories';
import { BLOCKING_SUBMISSION_STATUSES, SUBMISSION_STORAGE } from '../constants';
import { SubmitTaskDto } from '../dto';
import { TaskStartedEvent, TaskSubmittedEvent } from '../events';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

/**
 * Handles a user joining a campaign through its first task, and submitting
 * evidence for a task. Verification is manual-only in this phase: every
 * submission lands at PENDING_MANUAL with a QUEUED AIVerificationJob row
 * that Phase 8's AI service will later pick up and complete instead.
 */
@Injectable()
export class TaskParticipationService {
  constructor(
    private readonly campaignTaskRepository: CampaignTaskRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly participantRepository: CampaignParticipantRepository,
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly storageService: LocalStorageService,
    private readonly eventEmitter: EventEmitter2,
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

  async submitTask(taskId: string, userId: string, dto: SubmitTaskDto, file?: Express.Multer.File) {
    const { task, campaign } = await this.getActiveTask(taskId);

    const participant = await this.participantRepository.findByCampaignAndUser(campaign.id, userId);
    if (!participant) {
      throw new BadRequestException('Start the task before submitting evidence');
    }

    const latestAttempt = await this.submissionRepository.findLatestAttempt(participant.id, taskId);
    if (latestAttempt && BLOCKING_SUBMISSION_STATUSES.includes(latestAttempt.status)) {
      throw new BadRequestException(`This task already has a submission in ${latestAttempt.status} status`);
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
      status: 'PENDING_MANUAL',
      verificationSource: 'MANUAL',
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
        riskLevel: 'HIGH',
        reason: 'Uploaded evidence matches a file already submitted by a different user',
      });
    } else if (fraudMatch) {
      await this.submissionRepository.createFraudFlag({
        submission: { connect: { id: submission.id } },
        user: { connect: { id: userId } },
        riskLevel: 'LOW',
        reason: 'Uploaded evidence matches a file this user submitted before',
      });
    }

    this.eventEmitter.emit('task.submitted', new TaskSubmittedEvent(submission.id, taskId, campaign.id, userId));

    return this.submissionRepository.findById(submission.id);
  }

  private async getActiveTask(taskId: string) {
    const task = await this.campaignTaskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    const campaign = await this.campaignRepository.findById(task.campaignId);
    if (!campaign) throw new NotFoundException('Campaign not found');
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
