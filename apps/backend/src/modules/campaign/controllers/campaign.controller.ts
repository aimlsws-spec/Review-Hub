import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { UpdateCampaignDto } from '../dto';
import { CampaignOwnershipGuard } from '../guards';
import { CampaignService } from '../services';

@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@Controller({ path: 'campaigns', version: '1' })
@UseGuards(CampaignOwnershipGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get(':campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a campaign by id' })
  async getOne(@Param('campaignId') campaignId: string) {
    return this.campaignService.getById(campaignId);
  }

  @Patch(':campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft campaign' })
  async update(
    @Param('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(campaignId, userId, dto);
  }

  @Post(':campaignId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a campaign for approval' })
  async submit(@Param('campaignId') campaignId: string) {
    return this.campaignService.submitForApproval(campaignId);
  }

  @Post(':campaignId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate an approved/scheduled campaign' })
  async activate(@Param('campaignId') campaignId: string) {
    return this.campaignService.activate(campaignId);
  }

  @Post(':campaignId/pause')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause a running campaign' })
  async pause(@Param('campaignId') campaignId: string) {
    return this.campaignService.pause(campaignId);
  }

  @Post(':campaignId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a paused campaign' })
  async resume(@Param('campaignId') campaignId: string) {
    return this.campaignService.resume(campaignId);
  }

  @Post(':campaignId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a campaign' })
  async cancel(@Param('campaignId') campaignId: string) {
    return this.campaignService.cancel(campaignId);
  }

  @Delete(':campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a draft or cancelled campaign' })
  async remove(@Param('campaignId') campaignId: string) {
    return this.campaignService.remove(campaignId);
  }
}
