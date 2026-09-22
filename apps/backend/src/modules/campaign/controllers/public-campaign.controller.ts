import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { Public } from '@common/decorators';

import { PublicCampaignQueryDto } from '../dto';
import { CampaignService } from '../services';

@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@Controller({ path: 'campaigns', version: '1' })
export class PublicCampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Browse active, public campaigns' })
  async browse(@Query() query: PublicCampaignQueryDto) {
    return this.campaignService.listPublic(query);
  }

  @Get(':campaignId/details')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One active, public campaign' })
  async details(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.campaignService.getPublicById(campaignId);
  }
}
