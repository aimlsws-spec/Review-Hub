import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Campaign, CampaignStatus, Prisma } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CAMPAIGN_STATUS_TRANSITIONS, DELETABLE_CAMPAIGN_STATUSES, EDITABLE_CAMPAIGN_STATUSES } from '../constants';
import {
  ApproveCampaignDto,
  CampaignQueryDto,
  CreateCampaignDto,
  PublicCampaignQueryDto,
  RejectCampaignDto,
  RequestCampaignChangesDto,
  UpdateCampaignDto,
} from '../dto';
import {
  CampaignCreatedEvent,
  CampaignStatusChangedEvent,
  CampaignSubmittedEvent,
  CampaignUpdatedEvent,
} from '../events';
import { CampaignRepository } from '../repositories';

@Injectable()
export class CampaignService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(merchantId: string, userId: string, dto: CreateCampaignDto) {
    const slug = await this.generateUniqueSlug(dto.title);

    const campaign = await this.campaignRepository.create({
      merchant: { connect: { id: merchantId } },
      title: dto.title,
      slug,
      shortDescription: dto.shortDescription,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      bannerUrl: dto.bannerUrl,
      campaignType: dto.campaignType,
      visibility: dto.visibility,
      priority: dto.priority,
      rewardType: dto.rewardType,
      rewardAmount: dto.rewardAmount,
      totalBudget: dto.totalBudget,
      remainingBudget: dto.totalBudget,
      maxParticipants: dto.maxParticipants,
      minimumUserLevel: dto.minimumUserLevel,
      minimumFollowers: dto.minimumFollowers,
      minimumAge: dto.minimumAge,
      maximumAge: dto.maximumAge,
      targetGender: dto.targetGender,
      targetCountries: dto.targetCountries,
      targetStates: dto.targetStates,
      targetCities: dto.targetCities,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      autoApprove: dto.autoApprove ?? false,
      aiThreshold: dto.aiThreshold,
      status: 'DRAFT',
      createdBy: userId,
    });

    this.eventEmitter.emit('campaign.created', new CampaignCreatedEvent(campaign.id, merchantId, campaign.title));

    return this.getById(campaign.id);
  }

  async getById(campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    return campaign;
  }

  async listByMerchant(merchantId: string, query: CampaignQueryDto) {
    return this.campaignRepository.findByMerchant({
      merchantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  async listPublic(query: PublicCampaignQueryDto) {
    return this.campaignRepository.findPublic({
      page: query.page,
      limit: query.limit,
      campaignType: query.campaignType,
      search: query.search,
    });
  }

  async update(campaignId: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.getById(campaignId);
    this.assertEditable(campaign);

    const data: Prisma.CampaignUpdateInput = {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      updatedBy: userId,
    };
    if (dto.totalBudget !== undefined) {
      data.remainingBudget = dto.totalBudget - Number(campaign.spentBudget);
    }

    const updated = await this.campaignRepository.update(campaignId, data);

    this.eventEmitter.emit('campaign.updated', new CampaignUpdatedEvent(campaignId, dto as unknown as Record<string, unknown>));

    return updated;
  }

  /**
   * Moves a DRAFT/CHANGES_REQUESTED campaign into the approval workflow.
   * autoApprove is a merchant-set request, not a bypass of review: today it
   * skips straight to APPROVED, but Phase 8's fraud/AI service is meant to
   * gate this decision instead of trusting the flag outright.
   */
  async submitForApproval(campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot submit a campaign in ${campaign.status} status`);
    }

    const autoApproved = campaign.autoApprove;
    const toStatus: CampaignStatus = autoApproved ? 'APPROVED' : 'PENDING_REVIEW';

    const updated = await this.campaignRepository.update(campaignId, {
      status: toStatus,
      approvedAt: autoApproved ? new Date() : undefined,
    });

    this.eventEmitter.emit('campaign.submitted', new CampaignSubmittedEvent(campaignId, campaign.merchantId, autoApproved));
    this.emitStatusChanged(campaign, toStatus);

    return updated;
  }

  async activate(campaignId: string) {
    return this.transitionStatus(campaignId, 'ACTIVE', { publishedAt: new Date() });
  }

  async pause(campaignId: string) {
    return this.transitionStatus(campaignId, 'PAUSED');
  }

  async resume(campaignId: string) {
    return this.transitionStatus(campaignId, 'ACTIVE');
  }

  async cancel(campaignId: string) {
    return this.transitionStatus(campaignId, 'CANCELLED');
  }

  /** Admin queue: campaigns awaiting a moderation decision, oldest first. */
  async listPendingReview(page: number, limit: number) {
    return this.campaignRepository.findPendingReview({ page, limit });
  }

  async approve(campaignId: string, reviewerId: string, dto: ApproveCampaignDto) {
    const before = await this.getById(campaignId);
    const updated = await this.transitionStatus(campaignId, 'APPROVED', { approvedAt: new Date() });
    await this.campaignRepository.createApproval({
      campaign: { connect: { id: campaignId } },
      reviewer: { connect: { id: reviewerId } },
      status: 'APPROVED',
      comments: dto.comments,
    });
    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'Campaign',
      entityId: campaignId,
      action: 'APPROVE',
      before: { status: before.status } as Prisma.InputJsonValue,
      after: { status: 'APPROVED' } as Prisma.InputJsonValue,
    });
    return updated;
  }

  async reject(campaignId: string, reviewerId: string, dto: RejectCampaignDto) {
    const before = await this.getById(campaignId);
    const updated = await this.transitionStatus(campaignId, 'REJECTED');
    await this.campaignRepository.createApproval({
      campaign: { connect: { id: campaignId } },
      reviewer: { connect: { id: reviewerId } },
      status: 'REJECTED',
      comments: dto.reason,
    });
    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'Campaign',
      entityId: campaignId,
      action: 'REJECT',
      before: { status: before.status } as Prisma.InputJsonValue,
      after: { status: 'REJECTED', reason: dto.reason } as Prisma.InputJsonValue,
    });
    return updated;
  }

  async requestChanges(campaignId: string, reviewerId: string, dto: RequestCampaignChangesDto) {
    const before = await this.getById(campaignId);
    const updated = await this.transitionStatus(campaignId, 'CHANGES_REQUESTED');
    await this.campaignRepository.createApproval({
      campaign: { connect: { id: campaignId } },
      reviewer: { connect: { id: reviewerId } },
      status: 'CHANGES_REQUESTED',
      comments: dto.comments,
    });
    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'Campaign',
      entityId: campaignId,
      action: 'STATUS_CHANGE',
      before: { status: before.status } as Prisma.InputJsonValue,
      after: { status: 'CHANGES_REQUESTED', comments: dto.comments } as Prisma.InputJsonValue,
    });
    return updated;
  }

  async remove(campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (!DELETABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
      throw new BadRequestException(`Cannot delete a campaign in ${campaign.status} status`);
    }
    return this.campaignRepository.softDelete(campaignId);
  }

  private async transitionStatus(campaignId: string, toStatus: CampaignStatus, extra: Prisma.CampaignUpdateInput = {}) {
    const campaign = await this.getById(campaignId);
    const allowed = CAMPAIGN_STATUS_TRANSITIONS[campaign.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(`Cannot move a campaign from ${campaign.status} to ${toStatus}`);
    }

    const updated = await this.campaignRepository.update(campaignId, { status: toStatus, ...extra });
    this.emitStatusChanged(campaign, toStatus);
    return updated;
  }

  private assertEditable(campaign: Campaign) {
    if (!EDITABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
      throw new BadRequestException(`Cannot edit a campaign in ${campaign.status} status`);
    }
  }

  private emitStatusChanged(campaign: Campaign, toStatus: CampaignStatus) {
    this.eventEmitter.emit(
      'campaign.status_changed',
      new CampaignStatusChangedEvent(campaign.id, campaign.merchantId, campaign.status, toStatus),
    );
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 160);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(3).toString('hex');
      const candidate = `${base}-${suffix}`;
      const existing = await this.campaignRepository.findBySlug(candidate);
      if (!existing) return candidate;
    }

    throw new BadRequestException('Could not generate a unique campaign slug, please try again');
  }
}
