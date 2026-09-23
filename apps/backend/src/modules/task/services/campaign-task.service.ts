import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignTask, EvidenceType, TaskType } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { EDITABLE_CAMPAIGN_STATUSES } from '../../campaign/constants';
import { CampaignRepository } from '../../campaign/repositories';
import { CreateCampaignTaskDto, UpdateCampaignTaskDto } from '../dto';
import { CampaignTaskCreatedEvent } from '../events';
import { CampaignTaskRepository } from '../repositories';

const DEFAULT_LOCATION_CHECKIN_RADIUS_METERS = 200;

/**
 * Manages the tasks a merchant defines for their own campaign. Task
 * definitions can only change while the campaign itself is still editable
 * (DRAFT/CHANGES_REQUESTED) so a live campaign's rules can't shift under
 * participants who already joined.
 */
@Injectable()
export class CampaignTaskService {
  constructor(
    private readonly campaignTaskRepository: CampaignTaskRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(campaignId: string, dto: CreateCampaignTaskDto) {
    const campaign = await this.assertEditableCampaign(campaignId);
    const configuration = this.prepareConfiguration(dto.taskType, dto.configuration);

    const task = await this.campaignTaskRepository.create({
      campaign: { connect: { id: campaign.id } },
      title: dto.title,
      description: dto.description,
      instructions: dto.instructions,
      taskType: dto.taskType,
      verificationType: dto.verificationType,
      taskOrder: dto.taskOrder,
      rewardAmount: dto.rewardAmount,
      required: dto.required,
      minimumTimeSeconds: dto.minimumTimeSeconds,
      proofRequired: dto.proofRequired,
      // A QR/location task is only ever verified by its own deterministic check, regardless of what proof type the
      // caller asked for — the submission screen keys off this to show the scanner/check-in UI instead of a file picker.
      proofType: this.forcedProofType(dto.taskType) ?? dto.proofType,
      configuration: configuration as never,
    });

    this.eventEmitter.emit('task.created', new CampaignTaskCreatedEvent(task.id, campaignId));

    return task;
  }

  async update(campaignId: string, taskId: string, dto: UpdateCampaignTaskDto) {
    await this.assertEditableCampaign(campaignId);
    const task = await this.getTaskInCampaign(campaignId, taskId);

    const { configuration: rawConfiguration, ...updateFields } = dto;
    const configuration =
      rawConfiguration !== undefined ? this.prepareConfiguration(task.taskType, rawConfiguration) : undefined;

    return this.campaignTaskRepository.update(task.id, {
      ...updateFields,
      ...(configuration !== undefined ? { configuration: configuration as never } : {}),
    });
  }

  async remove(campaignId: string, taskId: string) {
    await this.assertEditableCampaign(campaignId);
    const task = await this.getTaskInCampaign(campaignId, taskId);

    return this.campaignTaskRepository.softDelete(task.id);
  }

  /** Tasks visible to participants: only for a campaign that's live and public. */
  async listPublic(campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign || campaign.status !== 'ACTIVE' || campaign.visibility !== 'PUBLIC') {
      throw new NotFoundException('Campaign');
    }
    const tasks = await this.campaignTaskRepository.findByCampaignId(campaignId);
    return tasks.map((task) => this.redactForParticipant(task));
  }

  /** The expected QR code is the whole point of a QR_SCAN task's proof — the app must never receive it. */
  private redactForParticipant(task: CampaignTask): CampaignTask {
    if (task.taskType !== 'QR_SCAN' || !task.configuration || typeof task.configuration !== 'object') return task;
    const configuration = { ...(task.configuration as Record<string, unknown>) };
    delete configuration.qrCode;
    return { ...task, configuration: configuration as never };
  }

  /** QR/location configuration is validated here, not in the DTO, since what counts as valid depends on `taskType`. */
  private prepareConfiguration(taskType: TaskType, configuration: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (taskType === 'QR_SCAN') {
      const qrCode = configuration?.qrCode;
      if (typeof qrCode !== 'string' || !qrCode.trim()) {
        throw new BadRequestException('A QR_SCAN task needs configuration.qrCode: the value printed on the merchant\'s QR code');
      }
      return { ...configuration, qrCode: qrCode.trim() };
    }

    if (taskType === 'LOCATION_CHECKIN') {
      const { latitude, longitude, radiusMeters } = configuration ?? {};
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        throw new BadRequestException('A LOCATION_CHECKIN task needs configuration.latitude, between -90 and 90');
      }
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        throw new BadRequestException('A LOCATION_CHECKIN task needs configuration.longitude, between -180 and 180');
      }
      if (radiusMeters !== undefined && (typeof radiusMeters !== 'number' || radiusMeters <= 0)) {
        throw new BadRequestException('configuration.radiusMeters must be a positive number');
      }
      return { ...configuration, latitude, longitude, radiusMeters: radiusMeters ?? DEFAULT_LOCATION_CHECKIN_RADIUS_METERS };
    }

    return configuration;
  }

  private forcedProofType(taskType: TaskType): EvidenceType | undefined {
    if (taskType === 'QR_SCAN') return EvidenceType.QR_CODE;
    if (taskType === 'LOCATION_CHECKIN') return EvidenceType.LOCATION;
    return undefined;
  }

  private async getTaskInCampaign(campaignId: string, taskId: string) {
    const task = await this.campaignTaskRepository.findById(taskId);
    if (!task || task.campaignId !== campaignId) {
      throw new NotFoundException('Task');
    }
    return task;
  }

  private async assertEditableCampaign(campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    if (!EDITABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
      throw new BadRequestException(`Cannot change tasks on a campaign in ${campaign.status} status`);
    }
    return campaign;
  }
}
