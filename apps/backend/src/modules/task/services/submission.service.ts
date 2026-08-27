import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CampaignRepository } from '../../campaign/repositories';
import { REVIEWABLE_SUBMISSION_STATUSES } from '../constants';
import { RejectSubmissionDto, SubmissionQueryDto } from '../dto';
import { SubmissionApprovedEvent, SubmissionRejectedEvent } from '../events';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly campaignTaskRepository: CampaignTaskRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly participantRepository: CampaignParticipantRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listMine(userId: string, query: SubmissionQueryDto) {
    return this.submissionRepository.findByUser({
      userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  async getMine(submissionId: string, userId: string) {
    const submission = await this.submissionRepository.findById(submissionId);
    // A submission owned by someone else is reported as not found, not
    // forbidden, so ids can't be used to probe for other users' activity.
    if (!submission || submission.userId !== userId) {
      throw new NotFoundException('Submission');
    }
    return submission;
  }

  /**
   * Minimal reviewer action so Phase 3's reward pipeline has something to
   * trigger off. Phase 5 builds the admin queue/dashboard around this same
   * action; this is not that dashboard.
   */
  async approve(submissionId: string, reviewerId: string) {
    return this.finalizeApproval(submissionId, { actorId: reviewerId, actorType: 'ADMIN' });
  }

  async reject(submissionId: string, reviewerId: string, dto: RejectSubmissionDto) {
    return this.finalizeRejection(submissionId, dto.rejectionReason, { actorId: reviewerId, actorType: 'ADMIN' });
  }

  /** Same outcome as {@link approve}, but for the AI service's own auto-decision — no human reviewer to connect. */
  async aiApprove(submissionId: string) {
    return this.finalizeApproval(submissionId, { actorType: 'SYSTEM' });
  }

  /** Same outcome as {@link reject}, but for the AI service's own auto-decision. */
  async aiReject(submissionId: string, reason: string) {
    return this.finalizeRejection(submissionId, reason, { actorType: 'SYSTEM' });
  }

  /** AI confidence was too low (or fraud risk too high) to auto-decide — escalate to a human reviewer. */
  async deferToManualReview(submissionId: string) {
    const submission = await this.getReviewable(submissionId);

    const updated = await this.submissionRepository.update(submissionId, { status: 'PENDING_MANUAL' });

    await this.auditLogService.record({
      actorId: 'ai-verification-service',
      actorType: 'SYSTEM',
      entity: 'TaskSubmission',
      entityId: submissionId,
      action: 'UPDATE',
      before: { status: submission.status },
      after: { status: 'PENDING_MANUAL' },
    });

    return updated;
  }

  private async finalizeApproval(
    submissionId: string,
    actor: { actorType: 'ADMIN' | 'SYSTEM'; actorId?: string },
  ) {
    const submission = await this.getReviewable(submissionId);

    const task = await this.campaignTaskRepository.findById(submission.taskId);
    if (!task) throw new NotFoundException('Task');
    const campaign = await this.campaignRepository.findById(task.campaignId);
    if (!campaign) throw new NotFoundException('Campaign');

    const rewardAmount = Number(task.rewardAmount ?? campaign.rewardAmount);

    const updated = await this.submissionRepository.update(submissionId, {
      status: 'APPROVED',
      reviewer: actor.actorId ? { connect: { id: actor.actorId } } : undefined,
      reviewedAt: new Date(),
      rewardAmount,
    });

    await this.advanceParticipant(submission.participantId, task.campaignId);

    this.eventEmitter.emit(
      'task.submission.approved',
      new SubmissionApprovedEvent(submissionId, task.id, campaign.id, submission.userId, rewardAmount),
    );

    await this.auditLogService.record({
      actorId: actor.actorId ?? 'ai-verification-service',
      actorType: actor.actorType,
      entity: 'TaskSubmission',
      entityId: submissionId,
      action: 'APPROVE',
      before: { status: submission.status },
      after: { status: 'APPROVED', rewardAmount },
    });

    return updated;
  }

  private async finalizeRejection(
    submissionId: string,
    reason: string,
    actor: { actorType: 'ADMIN' | 'SYSTEM'; actorId?: string },
  ) {
    const submission = await this.getReviewable(submissionId);

    const updated = await this.submissionRepository.update(submissionId, {
      status: 'REJECTED',
      reviewer: actor.actorId ? { connect: { id: actor.actorId } } : undefined,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });

    this.eventEmitter.emit(
      'task.submission.rejected',
      new SubmissionRejectedEvent(submissionId, submission.taskId, submission.userId, reason),
    );

    await this.auditLogService.record({
      actorId: actor.actorId ?? 'ai-verification-service',
      actorType: actor.actorType,
      entity: 'TaskSubmission',
      entityId: submissionId,
      action: 'REJECT',
      before: { status: submission.status },
      after: { status: 'REJECTED', reason },
    });

    return updated;
  }

  private async getReviewable(submissionId: string) {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) throw new NotFoundException('Submission');
    if (!REVIEWABLE_SUBMISSION_STATUSES.includes(submission.status)) {
      throw new BadRequestException(`Submission is already ${submission.status.toLowerCase()}`);
    }
    return submission;
  }

  private async advanceParticipant(participantId: string, campaignId: string) {
    const tasksTotal = await this.campaignTaskRepository.countActiveByCampaignId(campaignId);

    // Let Prisma compute the new count server-side, then derive progress
    // from what actually landed rather than trusting a locally-tracked value.
    const updated = await this.participantRepository.update(participantId, {
      tasksCompleted: { increment: 1 },
    });

    const progress = tasksTotal > 0 ? Math.min(100, Math.round((updated.tasksCompleted / tasksTotal) * 100)) : 0;
    const isComplete = tasksTotal > 0 && updated.tasksCompleted >= tasksTotal;

    await this.participantRepository.update(participantId, {
      progress,
      status: isComplete ? 'COMPLETED' : undefined,
      completedAt: isComplete ? new Date() : undefined,
    });
  }
}
