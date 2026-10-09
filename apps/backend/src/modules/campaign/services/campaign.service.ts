import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Campaign, CampaignStatus, Prisma, RewardType } from '@prisma/client';

import { CampaignSort } from '@common/enums';
import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantWalletRepository } from '../../merchant/repositories';
import {
  CAMPAIGN_STATUS_TRANSITIONS,
  DELETABLE_CAMPAIGN_STATUSES,
  EDITABLE_CAMPAIGN_STATUSES,
  ENABLED_CAMPAIGN_TYPES,
  ENABLED_TASK_TYPES,
} from '../constants';
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
import { CampaignBudgetNotCoveredException } from '../exceptions/budget-not-covered.exception';
import { CampaignRepository } from '../repositories';
import { taskLinkProblem } from '../task-link';

import { CampaignPolicyService } from './campaign-policy.service';


@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignRepository: CampaignRepository,
    private readonly merchantWalletRepository: MerchantWalletRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
    private readonly policyService: CampaignPolicyService,
  ) {}

  async create(merchantId: string, userId: string, dto: CreateCampaignDto) {
    assertCampaignDates(toDate(dto.startAt), toDate(dto.endAt));
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
      visibility: dto.visibility ?? undefined,
      priority: dto.priority ?? undefined,
      rewardType: RewardType.CASH,
      rewardAmount: dto.rewardAmount,
      totalBudget: dto.totalBudget,
      remainingBudget: dto.totalBudget,
      maxParticipants: dto.maxParticipants,
      minimumUserLevel: dto.minimumUserLevel ?? undefined,
      minimumFollowers: dto.minimumFollowers ?? undefined,
      minimumAge: dto.minimumAge,
      maximumAge: dto.maximumAge,
      targetGender: dto.targetGender ?? undefined,
      targetCountries: dto.targetCountries,
      targetStates: dto.targetStates,
      targetCities: dto.targetCities,
      startAt: toDate(dto.startAt) ?? undefined,
      endAt: toDate(dto.endAt) ?? undefined,
      autoApprove: dto.autoApprove ?? false,
      aiThreshold: dto.aiThreshold ?? undefined,
      status: 'DRAFT',
      createdBy: userId,
    });

    this.eventEmitter.emit('campaign.created', new CampaignCreatedEvent(campaign.id, merchantId, campaign.title));

    return this.getById(campaign.id);
  }

  /**
   * Copies a campaign into a new DRAFT (spec §9.4 "Duplicate Campaign"): content, reward, budget, targeting, tasks,
   * media, categories and tags. Everything that describes what already *happened* to the original is not copied:
   * budget reserved or spent, participants, approval, publishing, featuring and its dates. Dates are cleared because
   * the original's are usually in the past; the merchant sets new ones before submitting. The copy goes through the
   * normal approval flow like any new campaign, and no money moves until it is activated.
   */
  async duplicate(campaignId: string, userId: string) {
    const source = await this.campaignRepository.findForDuplication(campaignId);
    if (!source) throw new NotFoundException('Campaign');
    // A copy is a new campaign, so it may only be of a kind, with tasks, that can be created today.
    if (!ENABLED_CAMPAIGN_TYPES.includes(source.campaignType)) {
      throw new BadRequestException(`${source.campaignType} campaigns can not be created at the moment, so this one can not be copied`);
    }
    if (source.tasks.some((task) => !ENABLED_TASK_TYPES.includes(task.taskType))) {
      throw new BadRequestException('This campaign has a task of a kind that can not be added at the moment, so it can not be copied');
    }

    const title = `${source.title} (copy)`.slice(0, 200);
    const slug = await this.generateUniqueSlug(title);
    // Prisma rejects a plain `null` for a JSON column; leaving the field out stores NULL just the same.
    const json = (value: Prisma.JsonValue | null) => (value === null ? undefined : (value as Prisma.InputJsonValue));

    const copy = await this.campaignRepository.create({
      merchant: { connect: { id: source.merchantId } },
      title,
      slug,
      shortDescription: source.shortDescription,
      description: source.description,
      thumbnailUrl: source.thumbnailUrl,
      bannerUrl: source.bannerUrl,
      campaignType: source.campaignType,
      visibility: source.visibility,
      priority: source.priority,
      // An old campaign may carry a non-cash label; it was always paid in cash, and a copy is cash like any new one.
      rewardType: RewardType.CASH,
      rewardAmount: source.rewardAmount,
      totalBudget: source.totalBudget,
      remainingBudget: source.totalBudget,
      maxParticipants: source.maxParticipants,
      minimumUserLevel: source.minimumUserLevel,
      minimumFollowers: source.minimumFollowers,
      minimumAge: source.minimumAge,
      maximumAge: source.maximumAge,
      targetGender: source.targetGender,
      targetCountries: json(source.targetCountries),
      targetStates: json(source.targetStates),
      targetCities: json(source.targetCities),
      autoApprove: source.autoApprove,
      aiThreshold: source.aiThreshold,
      status: 'DRAFT',
      metadata: { duplicatedFromCampaignId: source.id },
      createdBy: userId,
      tasks: {
        create: source.tasks.map((task) => ({
          title: task.title,
          description: task.description,
          instructions: task.instructions,
          taskType: task.taskType,
          verificationType: task.verificationType,
          taskOrder: task.taskOrder,
          rewardAmount: task.rewardAmount,
          required: task.required,
          minimumTimeSeconds: task.minimumTimeSeconds,
          proofRequired: task.proofRequired,
          proofType: task.proofType,
          // A QR_SCAN task keeps its code: a copy is usually the same store with the same printed QR. The merchant
          // can change it while the copy is a draft.
          configuration: json(task.configuration),
        })),
      },
      media: {
        create: source.media.map((item) => ({
          type: item.type,
          url: item.url,
          thumbnail: item.thumbnail,
          displayOrder: item.displayOrder,
          metadata: json(item.metadata),
        })),
      },
      targets: {
        create: source.targets.map((target) => ({
          countryId: target.countryId,
          stateId: target.stateId,
          cityId: target.cityId,
          minimumAge: target.minimumAge,
          maximumAge: target.maximumAge,
          minimumFollowers: target.minimumFollowers,
          minimumLevel: target.minimumLevel,
          gender: target.gender,
        })),
      },
      categories: { create: source.categories.map(({ categoryId }) => ({ category: { connect: { id: categoryId } } })) },
      tags: { create: source.tags.map(({ tagId }) => ({ tag: { connect: { id: tagId } } })) },
    });

    this.eventEmitter.emit('campaign.created', new CampaignCreatedEvent(copy.id, source.merchantId, copy.title));
    await this.auditLogService.record({
      actorId: userId,
      actorType: 'MERCHANT',
      entity: 'Campaign',
      entityId: copy.id,
      action: 'CREATE',
      after: { duplicatedFromCampaignId: source.id } as Prisma.InputJsonValue,
    });

    return this.getById(copy.id);
  }

  async getById(campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    return campaign;
  }

  /** One campaign as the app shows it: only if it is active and public. */
  async getPublicById(campaignId: string) {
    const campaign = await this.campaignRepository.findPublicById(campaignId);
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
    if (query.sort === CampaignSort.Nearest && (query.latitude === undefined || query.longitude === undefined)) {
      throw new BadRequestException('sort=nearest needs latitude and longitude');
    }

    return this.campaignRepository.findPublic({
      page: query.page,
      limit: query.limit,
      campaignType: query.campaignType,
      search: query.search,
      sort: query.sort,
      latitude: query.latitude,
      longitude: query.longitude,
    });
  }

  async listEligibleForUser(userId: string, query: PublicCampaignQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User');

    let level = 0;
    const gamification = await this.prisma.userGamificationProfile.findUnique({ where: { userId } });
    if (gamification) {
      level = gamification.level;
    }

    const age = user.dateOfBirth
      ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / 3.15576e+10)
      : undefined;

    return this.campaignRepository.findAvailableForUser({
      userId,
      page: query.page,
      limit: query.limit,
      age,
      gender: user.gender || undefined,
      followers: user.socialFollowers,
      level,
      countryId: user.countryId || undefined,
      stateId: user.stateId || undefined,
      cityId: user.cityId || undefined,
    });
  }

  async update(campaignId: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.getById(campaignId);
    this.assertEditable(campaign);

    // null clears a date (the form's field was emptied); left out keeps it.
    const startAt = toDate(dto.startAt);
    const endAt = toDate(dto.endAt);
    assertCampaignDates(startAt === undefined ? campaign.startAt : startAt, endAt === undefined ? campaign.endAt : endAt);

    const data: Prisma.CampaignUpdateInput = { ...withoutNullsFor(dto, REQUIRED_COLUMNS), startAt, endAt, updatedBy: userId };
    if (dto.totalBudget !== undefined) {
      data.remainingBudget = dto.totalBudget - Number(campaign.spentBudget);
    }

    const updated = await this.campaignRepository.update(campaignId, data);

    this.eventEmitter.emit('campaign.updated', new CampaignUpdatedEvent(campaignId, dto as unknown as Record<string, unknown>));

    return updated;
  }

  /**
   * Moves a DRAFT/CHANGES_REQUESTED campaign into the approval workflow.
   *
   * WHY every campaign goes to an admin: `autoApprove` is set by the merchant, so honouring it would let anyone
   * approve their own campaign and skip moderation, including the check that a reward is never tied to a rating.
   * The flag is still stored, ready for the day an AI/risk check can decide instead of the merchant, but until
   * then it changes nothing.
   */
  async submitForApproval(campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot submit a campaign in ${campaign.status} status`);
    }

    // Without a task there is nothing for a participant to do once it is live.
    if (!campaign.tasks?.length) {
      throw new BadRequestException('Add at least one task before submitting this campaign for review');
    }
    // A task done on another site needs its link, or a participant has nowhere to go. Tasks made before links
    // existed are caught here, so the merchant adds one before an admin reviews the campaign.
    for (const task of campaign.tasks) {
      const problem = taskLinkProblem(task.taskType, (task.configuration as Record<string, unknown> | null)?.targetUrl);
      if (problem) throw new BadRequestException(`Task "${task.title}": ${problem}`, 'TASK_LINK_INVALID');
    }
    assertCampaignDates(campaign.startAt, campaign.endAt);
    await this.assertBudgetCovered(campaign.merchantId, Number(campaign.totalBudget));

    // Wording that asks for, or rewards, a particular rating is refused here, before an admin ever has to see it.
    await this.policyService.assertCampaignAllowed(campaign, 'submitted');

    const toStatus: CampaignStatus = 'PENDING_REVIEW';

    const updated = await this.campaignRepository.update(campaignId, { status: toStatus });

    this.eventEmitter.emit('campaign.submitted', new CampaignSubmittedEvent(campaignId, campaign.merchantId));
    this.emitStatusChanged(campaign, toStatus);

    return updated;
  }

  /**
   * Puts an approved campaign live, or, when its start date is still ahead, schedules it: either way the budget is
   * reserved now, so the money is committed the moment the merchant says go. CampaignScheduleService starts a
   * scheduled one when its time comes. Activating a scheduled campaign starts it at once.
   */
  async activate(campaignId: string) {
    const campaign = await this.getById(campaignId);
    const now = new Date();
    if (campaign.endAt && campaign.endAt <= now) {
      throw new BadRequestException("This campaign's end date has passed. Duplicate it to run it again with new dates");
    }
    if (campaign.status === 'APPROVED' && campaign.startAt && campaign.startAt > now) {
      return this.transitionStatus(campaignId, 'SCHEDULED');
    }
    return this.transitionStatus(campaignId, 'ACTIVE', { publishedAt: now });
  }

  /**
   * Only a campaign the wallet can pay for goes to an admin, so nobody approves one that can not run. Nothing is taken
   * here: the budget is reserved when the merchant activates the approved campaign, which checks the balance again.
   */
  private async assertBudgetCovered(merchantId: string, required: number) {
    const wallet = await this.merchantWalletRepository.findByMerchantId(merchantId);
    const available = Number(wallet?.availableBalance ?? 0);
    if (available < required) throw new CampaignBudgetNotCoveredException(available, required);
  }

  /** A scheduled campaign whose start time has come goes live. Its budget was reserved when it was scheduled. */
  async startScheduled(campaignId: string) {
    return this.transitionStatus(campaignId, 'ACTIVE', { publishedAt: new Date() });
  }

  /** A campaign past its end date is over. EXPIRED is final, so whatever budget it did not spend goes back. */
  async expire(campaignId: string) {
    return this.transitionStatus(campaignId, 'EXPIRED');
  }

  /**
   * A merchant funding (activating) one of their own campaigns. The campaign must belong to that merchant: the route
   * guard only proves the caller owns `merchantId`, not the campaign id next to it. Another merchant's campaign is
   * reported as not found, so its existence is not confirmed either.
   */
  async fundForMerchant(merchantId: string, campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (campaign.merchantId !== merchantId) throw new NotFoundException('Campaign');
    return this.activate(campaignId);
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
  /** The admin queue. Each campaign carries any wording flags, so the reviewer sees them without opening it. */
  async listPendingReview(page: number, limit: number) {
    const result = await this.campaignRepository.findPendingReview({ page, limit });
    const flags = await this.policyService.findingsForCampaigns(result.data);
    return { ...result, data: result.data.map((campaign) => ({ ...campaign, policyFlags: flags.get(campaign.id) ?? [] })) };
  }

  /** One campaign for its own merchant, with the feedback from each review. */
  async getForOwner(campaignId: string) {
    const campaign = await this.campaignRepository.findForOwner(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    return campaign;
  }

  /** One campaign in full for an admin, with its wording flags worked out as the queue shows them. */
  async getAdminDetail(campaignId: string) {
    const campaign = await this.campaignRepository.findForAdminReview(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    const flags = await this.policyService.findingsForCampaigns([campaign]);
    return { ...campaign, policyFlags: flags.get(campaign.id) ?? [] };
  }

  async approve(campaignId: string, reviewerId: string, dto: ApproveCampaignDto) {
    const before = await this.getById(campaignId);
    // A second check: tasks can be edited after a campaign is submitted, so what was clean then may not be now.
    await this.policyService.assertCampaignAllowed(before, 'approved');
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

    // Leaving APPROVED for live or scheduled reserves the full budget out of the merchant's wallet, once. Starting a
    // scheduled campaign or resuming a paused one does not: the budget is already held.
    const reservesBudget = campaign.status === 'APPROVED' && (toStatus === 'ACTIVE' || toStatus === 'SCHEDULED');
    if (reservesBudget) {
      await this.merchantWalletRepository.reserveCampaignBudget({
        merchantId: campaign.merchantId,
        campaignId,
        amount: Number(campaign.totalBudget),
      });
    }

    const updated = await this.campaignRepository.update(campaignId, { status: toStatus, ...extra });

    // Terminal statuses release whatever budget the campaign never spent.
    const isTerminal = (CAMPAIGN_STATUS_TRANSITIONS[toStatus] ?? []).length === 0;
    if (isTerminal) {
      await this.merchantWalletRepository.releaseCampaignBudget({ merchantId: campaign.merchantId, campaignId });
    }

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

/** A date from the API: undefined when left out, null when cleared. */
function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

/**
 * A campaign's dates make sense: an end date is in the future and after the start. A start date in the past is
 * fine: it simply means "as soon as it is activated".
 */
function assertCampaignDates(startAt: Date | null | undefined, endAt: Date | null | undefined) {
  if (!endAt) return;
  if (endAt <= new Date()) throw new BadRequestException('The end date must be in the future');
  if (startAt && endAt <= startAt) throw new BadRequestException('The end date must be after the start date');
}

/**
 * Campaign columns that always hold a value (a default stands in when none is given). A client may still send null
 * for one, e.g. a form's emptied number field; that means "not given", never "store nothing", which the database
 * would refuse.
 */
const REQUIRED_COLUMNS = ['visibility', 'priority', 'rewardType', 'minimumUserLevel', 'minimumFollowers', 'targetGender', 'aiThreshold'] as const;

/** The changes without a null for any of `keys`, so those keep their stored value. */
function withoutNullsFor<T extends object>(changes: T, keys: readonly string[]): T {
  return Object.fromEntries(
    Object.entries(changes).filter(([key, value]) => !(value === null && keys.includes(key))),
  ) as T;
}
