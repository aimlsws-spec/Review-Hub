import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { PublicCampaignQueryDto } from '../dto';
import { CampaignService } from '../services';

@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@Controller({ path: 'users/me/campaigns', version: '1' })
export class UserCampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('eligible')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Browse active campaigns filtered by my demographics' })
  async getEligible(
    @CurrentUser('id') userId: string,
    @Query() query: PublicCampaignQueryDto,
  ) {
    return this.campaignService.listEligibleForUser(userId, query);
  }
}
