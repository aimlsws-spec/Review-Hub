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

  @Post(':campaignId/fund')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fund and activate a campaign (deducts budget from merchant wallet)' })
  async fund(
    @Param('campaignId') campaignId: string,
  ) {
    // Calling activate will automatically reserve the campaign's totalBudget 
    // from the merchant's wallet.
    return this.campaignService.activate(campaignId);
  }

  @Get(':campaignId/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View real-time analytics for a campaign' })
  async analytics(
    @Param('merchantId') merchantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignService.getAnalytics(campaignId, merchantId);
  }
}
