import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { JoinedCampaignsQueryDto } from '../dto';
import { TaskProgressService } from '../services';

/** The signed-in person's own progress: what they can still do in a campaign, and the campaigns they joined. */
@ApiTags(SWAGGER_TAGS.TASKS)
@Controller({ path: 'users/me/campaigns', version: '1' })
@ApiBearerAuth()
export class TaskProgressController {
  constructor(private readonly taskProgressService: TaskProgressService) {}

  @Get('joined')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Campaigns I joined, under way or completed, with tasks done and amount earned' })
  async joined(@CurrentUser('id') userId: string, @Query() query: JoinedCampaignsQueryDto) {
    return this.taskProgressService.joinedCampaigns(userId, query);
  }

  @Get(':campaignId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Each task of a campaign for me: available, in review, completed, or open again at a time' })
  async progress(@CurrentUser('id') userId: string, @Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.taskProgressService.campaignProgress(userId, campaignId);
  }
}
