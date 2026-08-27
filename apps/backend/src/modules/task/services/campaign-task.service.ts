import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { EDITABLE_CAMPAIGN_STATUSES } from '../../campaign/constants';
import { CampaignRepository } from '../../campaign/repositories';
import { CreateCampaignTaskDto, UpdateCampaignTaskDto } from '../dto';
import { CampaignTaskCreatedEvent } from '../events';
import { CampaignTaskRepository } from '../repositories';

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
      proofType: dto.proofType,
      configuration: dto.configuration as never,
    });

    this.eventEmitter.emit('task.created', new CampaignTaskCreatedEvent(task.id, campaignId));

    return task;
  }

  async update(campaignId: string, taskId: string, dto: UpdateCampaignTaskDto) {
    await this.assertEditableCampaign(campaignId);
    const task = await this.getTaskInCampaign(campaignId, taskId);

    return this.campaignTaskRepository.update(task.id, {
      ...dto,
      configuration: dto.configuration as never,
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
    return this.campaignTaskRepository.findByCampaignId(campaignId);
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
