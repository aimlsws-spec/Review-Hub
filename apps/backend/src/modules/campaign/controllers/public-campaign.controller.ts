import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
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
}
