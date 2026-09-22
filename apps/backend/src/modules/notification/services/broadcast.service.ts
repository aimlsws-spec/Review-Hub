import { Injectable, Logger } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { BROADCAST_LIMITS, SMART_TIMING_EXCLUDED_TYPES } from '../constants';
import { AudienceFilterDto, BroadcastQueryDto, BroadcastResponseDto, CreateBroadcastDto } from '../dto';
import { AudienceFilter, AudienceReach, BroadcastChannel } from '../interfaces';
import { BroadcastAudienceRepository, BroadcastWithCreator, NotificationBroadcastRepository } from '../repositories';
import { assertSupportedPlaceholders } from '../utils/message-template.util';

import { BroadcastFanOutService } from './broadcast-fan-out.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What admins do with broadcasts: see who a message would reach, send or schedule it, follow its
 * progress and cancel it before it starts. Sending itself happens in the background (BroadcastFanOutService).
 */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly broadcastRepository: NotificationBroadcastRepository,
    private readonly audienceRepository: BroadcastAudienceRepository,
    private readonly fanOutService: BroadcastFanOutService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** How many users the filters match and how many each channel would really reach, before anything is sent. */
  async previewAudience(audience: AudienceFilterDto): Promise<AudienceReach> {
    this.assertAudienceIsSensible(audience);
    return this.audienceRepository.reach(audience);
  }

  async create(dto: CreateBroadcastDto, adminId: string): Promise<BroadcastResponseDto> {
    const now = new Date();
    assertSupportedPlaceholders(dto.title, dto.message);
    this.assertAudienceIsSensible(dto.audience);
    const scheduledAt = this.resolveSendTime(dto.scheduledAt, now);
    const type = dto.type ?? 'PROMOTIONAL';
    if (dto.smartTiming && SMART_TIMING_EXCLUDED_TYPES.includes(type)) {
      throw new BadRequestException('System announcements are sent straight away, so they cannot use smart timing');
    }

    // Refuse a send that would go nowhere, so an admin never believes a message went out when it did not.
    const reach = await this.audienceRepository.reach(dto.audience);
    if (reach.total === 0) throw new BadRequestException('No users match this audience');
    if (dto.channels.every((channel) => reach.byChannel[channel] === 0)) {
      throw new BadRequestException('None of the selected channels can reach anyone in this audience');
    }

    const broadcast = await this.broadcastRepository.create({
      createdById: adminId,
      title: dto.title,
      message: dto.message,
      type,
      channels: dto.channels,
      audience: { ...dto.audience },
      scheduledAt,
      smartTiming: dto.smartTiming ?? false,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'NotificationBroadcast',
      entityId: broadcast.id,
      action: 'CREATE',
      after: { title: dto.title, channels: dto.channels, audience: { ...dto.audience }, scheduledAt: scheduledAt.toISOString(), smartTiming: dto.smartTiming ?? false, reach: reach.total },
    });

    // A message for "now" starts straight away; a scheduled one waits for the once-a-minute check.
    if (!dto.scheduledAt) await this.fanOutService.enqueue(broadcast.id);

    this.logger.log(`Admin ${adminId} created broadcast ${broadcast.id} for ~${reach.total} users`);
    return this.toResponse(broadcast);
  }

  async list(query: BroadcastQueryDto) {
    const { data, total } = await this.broadcastRepository.list({ status: query.status, skip: query.skip, take: query.limit });
    return { data: data.map((broadcast) => this.toResponse(broadcast)), total, page: query.page, limit: query.limit };
  }

  /** One broadcast plus how its messages fared per channel. */
  async getById(id: string) {
    const broadcast = await this.findOrFail(id);
    const deliveries = await this.broadcastRepository.deliveryBreakdown(id);
    return { ...this.toResponse(broadcast), deliveries };
  }

  /** Only a broadcast that has not started can be cancelled; once messages are going out they cannot be recalled. */
  async cancel(id: string, adminId: string): Promise<BroadcastResponseDto> {
    await this.findOrFail(id);

    const cancelled = await this.broadcastRepository.cancelIfScheduled(id);
    if (!cancelled) throw new BadRequestException('Only a scheduled broadcast can be cancelled. This one has already started or finished.');

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'NotificationBroadcast',
      entityId: id,
      action: 'STATUS_CHANGE',
      before: { status: 'SCHEDULED' },
      after: { status: 'CANCELLED' },
    });

    return this.toResponse(await this.findOrFail(id));
  }

  /** States with their cities, for the audience form's location pickers. */
  async listLocations() {
    return this.audienceRepository.listLocations();
  }

  private async findOrFail(id: string): Promise<BroadcastWithCreator> {
    const broadcast = await this.broadcastRepository.findById(id);
    if (!broadcast) throw new NotFoundException('Broadcast');
    return broadcast;
  }

  private assertAudienceIsSensible(audience: AudienceFilter) {
    if (audience.minAge !== undefined && audience.maxAge !== undefined && audience.minAge > audience.maxAge) {
      throw new BadRequestException('Minimum age cannot be above maximum age');
    }
    if (audience.minLevel !== undefined && audience.maxLevel !== undefined && audience.minLevel > audience.maxLevel) {
      throw new BadRequestException('Minimum level cannot be above maximum level');
    }
  }

  /** No time means "now". A time must be far enough ahead to be intentional, and not so far ahead it is surely a typo. */
  private resolveSendTime(scheduledAt: string | undefined, now: Date): Date {
    if (!scheduledAt) return now;

    const when = new Date(scheduledAt);
    if (when.getTime() < now.getTime() + BROADCAST_LIMITS.MIN_LEAD_MS) {
      throw new BadRequestException('Schedule at least one minute ahead, or send it now');
    }
    if (when.getTime() > now.getTime() + BROADCAST_LIMITS.MAX_LEAD_DAYS * DAY_MS) {
      throw new BadRequestException(`Cannot schedule more than ${BROADCAST_LIMITS.MAX_LEAD_DAYS} days ahead`);
    }
    return when;
  }

  private toResponse(broadcast: BroadcastWithCreator): BroadcastResponseDto {
    return {
      id: broadcast.id,
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type,
      channels: broadcast.channels as BroadcastChannel[],
      audience: broadcast.audience as AudienceFilterDto,
      status: broadcast.status,
      scheduledAt: broadcast.scheduledAt,
      startedAt: broadcast.startedAt,
      completedAt: broadcast.completedAt,
      recipientCount: broadcast.recipientCount,
      smartTiming: broadcast.smartTiming,
      failureReason: broadcast.failureReason,
      createdAt: broadcast.createdAt,
      createdBy: { id: broadcast.createdBy.id, name: `${broadcast.createdBy.firstName} ${broadcast.createdBy.lastName}`.trim() },
    };
  }
}
