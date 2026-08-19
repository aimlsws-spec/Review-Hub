import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { CampaignQueryDto, CreateCampaignDto } from '../dto';
import { CampaignService } from '../services';

@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@Controller({ path: 'merchants/:merchantId/campaigns', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class MerchantCampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a campaign as this merchant' })
  async create(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignService.create(merchantId, userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's campaigns" })
  async list(@Param('merchantId') merchantId: string, @Query() query: CampaignQueryDto) {
    return this.campaignService.listByMerchant(merchantId, query);
  }
}
