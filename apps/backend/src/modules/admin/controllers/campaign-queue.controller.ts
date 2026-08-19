import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { ApproveCampaignDto, RejectCampaignDto, RequestCampaignChangesDto } from '../../campaign/dto';
import { CampaignService } from '../../campaign/services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/campaigns', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminCampaignQueueController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List campaigns awaiting moderation' })
  async listPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.campaignService.listPendingReview(Number(page), Number(limit));
  }

  @Post(':campaignId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending campaign' })
  async approve(@Param('campaignId') campaignId: string, @Body() dto: ApproveCampaignDto, @CurrentUser('id') adminId: string) {
    return this.campaignService.approve(campaignId, adminId, dto);
  }

  @Post(':campaignId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending campaign' })
  async reject(@Param('campaignId') campaignId: string, @Body() dto: RejectCampaignDto, @CurrentUser('id') adminId: string) {
    return this.campaignService.reject(campaignId, adminId, dto);
  }

  @Post(':campaignId/request-changes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a pending campaign back to the merchant for changes' })
  async requestChanges(
    @Param('campaignId') campaignId: string,
    @Body() dto: RequestCampaignChangesDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.campaignService.requestChanges(campaignId, adminId, dto);
  }
}
