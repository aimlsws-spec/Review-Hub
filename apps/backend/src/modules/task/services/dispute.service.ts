import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { DisputeQueryDto } from '../dto/dispute-query.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { DisputeResolvedEvent } from '../events';
import { DisputeRepository, TaskSubmissionRepository } from '../repositories';

import { SubmissionService } from './submission.service';

@Injectable()
export class DisputeService {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly submissionService: SubmissionService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDispute(submissionId: string, userId: string, dto: CreateDisputeDto) {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission || submission.userId !== userId) {
      throw new NotFoundException('Submission');
    }

    if (submission.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected submissions can be disputed');
    }

    const existingDispute = await this.disputeRepository.findBySubmissionId(submissionId);
    if (existingDispute) {
      throw new BadRequestException('A dispute already exists for this submission');
    }

    const dispute = await this.disputeRepository.create({
      submissionId,
      userId,
      reason: dto.reason,
      status: 'OPEN',
    });

    await this.auditLogService.record({
      actorId: userId,
      actorType: 'USER',
      entity: 'Dispute',
      entityId: dispute.id,
      action: 'CREATE',
      after: { reason: dto.reason, status: 'OPEN' },
    });

    return dispute;
  }

  async getAdminDisputes(query: DisputeQueryDto) {
    const { page, limit, status } = query;

    const [data, total] = await Promise.all([
      this.disputeRepository.findMany({ skip: query.skip, take: limit, status }),
      this.disputeRepository.count({ status }),
    ]);

    return { data, total, page, limit };
  }

  async resolveDispute(disputeId: string, reviewerId: string, dto: ResolveDisputeDto) {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute');
    }

    if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Dispute is already ${dispute.status.toLowerCase()}`);
    }

    const updated = await this.disputeRepository.update(disputeId, {
      status: dto.decision,
      adminNotes: dto.notes,
      resolvedBy: reviewerId,
      resolvedAt: new Date(),
    });

    if (dto.decision === 'REVERSED') {
      // SubmissionService.approve only accepts a submission out of REVIEWABLE_SUBMISSION_STATUSES,
      // which a REJECTED submission isn't — reopening it to PENDING first lets the normal approval
      // path (reward credit, participant progress, audit log) run unchanged instead of duplicating it here.
      await this.submissionRepository.update(dispute.submissionId, { status: 'PENDING' });
      await this.submissionService.approve(dispute.submissionId, reviewerId);
    }

    this.eventEmitter.emit(
      'task.dispute.resolved',
      new DisputeResolvedEvent(disputeId, dispute.submissionId, dispute.userId, dto.decision, dto.notes),
    );

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'Dispute',
      entityId: disputeId,
      action: 'STATUS_CHANGE',
      before: { status: dispute.status },
      after: { status: dto.decision, notes: dto.notes },
    });

    return updated;
  }
}
