import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { CampaignOwnershipGuard } from '../../campaign/guards';
import { CreateCampaignTaskDto, UpdateCampaignTaskDto } from '../dto';
import { CampaignTaskService } from '../services';

@ApiTags(SWAGGER_TAGS.TASKS)
@Controller({ path: 'campaigns/:campaignId/tasks', version: '1' })
@UseGuards(CampaignOwnershipGuard)
export class MerchantCampaignTaskController {
  constructor(private readonly campaignTaskService: CampaignTaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a task to this campaign' })
  async create(@Param('campaignId') campaignId: string, @Body() dto: CreateCampaignTaskDto) {
    return this.campaignTaskService.create(campaignId, dto);
  }

  @Patch(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task on this campaign' })
  async update(
    @Param('campaignId') campaignId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateCampaignTaskDto,
  ) {
    return this.campaignTaskService.update(campaignId, taskId, dto);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a task from this campaign' })
  async remove(@Param('campaignId') campaignId: string, @Param('taskId') taskId: string) {
    return this.campaignTaskService.remove(campaignId, taskId);
  }
}
