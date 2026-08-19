import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { Public } from '@common/decorators';

import { CampaignTaskService } from '../services';

@ApiTags(SWAGGER_TAGS.TASKS)
@Controller({ path: 'campaigns/:campaignId/tasks', version: '1' })
export class CampaignTaskController {
  constructor(private readonly campaignTaskService: CampaignTaskService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List the tasks of an active, public campaign' })
  async list(@Param('campaignId') campaignId: string) {
    return this.campaignTaskService.listPublic(campaignId);
  }
}
