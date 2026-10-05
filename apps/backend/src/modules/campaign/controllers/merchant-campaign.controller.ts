import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { MERCHANT_TEAM_PERMISSIONS } from '../../merchant/constants';
import { TeamRoles } from '../../merchant/decorators';
import { MerchantOwnershipGuard, MerchantTeamRoleGuard } from '../../merchant/guards';
import { AnalyticsQueryDto, CampaignQueryDto, CheckWordingDto, CreateCampaignDto, RecommendCampaignDto, ReportExportQueryDto } from '../dto';
import {
  CampaignBuilderService,
  CampaignPolicyService,
  CampaignService,
  MerchantAnalyticsService,
  MerchantInsightsService,
  MerchantReportExportService,
} from '../services';

@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@Controller({ path: 'merchants/:merchantId/campaigns', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class MerchantCampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly campaignBuilderService: CampaignBuilderService,
    private readonly insightsService: MerchantInsightsService,
    private readonly policyService: CampaignPolicyService,
    private readonly analyticsService: MerchantAnalyticsService,
    private readonly reportExportService: MerchantReportExportService,
  ) {}

  @Post()
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
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

  @Post('recommend')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommend a campaign (type, reward, budget split, dates and text) from a goal and budget. Nothing is created.' })
  async recommend(@Param('merchantId') merchantId: string, @Body() dto: RecommendCampaignDto) {
    return this.campaignBuilderService.recommend(merchantId, dto);
  }

  @Post('check-wording')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check campaign wording against the honest-feedback policy before saving. Nothing is stored.' })
  checkWording(@Body() dto: CheckWordingDto) {
    return this.policyService.check([
      { field: 'title', text: dto.title },
      { field: 'short description', text: dto.shortDescription },
      { field: 'description', text: dto.description },
      ...(dto.tasks ?? []).flatMap((task, index) => {
        const name = task.title ? `task "${task.title}"` : `task ${index + 1}`;
        return [
          { field: `${name} title`, text: task.title },
          { field: `${name} description`, text: task.description },
          { field: `${name} instructions`, text: task.instructions },
        ];
      }),
    ]);
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'How all of this merchant’s campaigns are doing: totals, each campaign, and day by day. Counted from real joins and rewards.' })
  async overview(@Param('merchantId') merchantId: string, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.overview(merchantId, query.days);
  }

  @Get('report')
  @ApiBearerAuth()
  @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf')
  @ApiOperation({
    summary: 'Download the campaign report (totals, every campaign, day by day) as CSV, Excel or PDF',
    description: 'Same figures as /overview for the same period, but lists every campaign instead of the top twenty.',
  })
  async exportReport(@Param('merchantId') merchantId: string, @Query() query: ReportExportQueryDto, @Res() res: Response) {
    const file = await this.reportExportService.export(merchantId, query.days, query.format);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(file.content);
  }

  @Get('insights')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'What campaigns cost per completed task, and suggestions for getting more from the budget' })
  async insights(@Param('merchantId') merchantId: string) {
    return this.insightsService.getInsights(merchantId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's campaigns" })
  async list(@Param('merchantId') merchantId: string, @Query() query: CampaignQueryDto) {
    return this.campaignService.listByMerchant(merchantId, query);
  }

  @Post(':campaignId/fund')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fund and activate a campaign (deducts budget from merchant wallet)' })
  async fund(
    @Param('merchantId') merchantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    // Activating reserves the campaign's total budget from the merchant's wallet.
    return this.campaignService.fundForMerchant(merchantId, campaignId);
  }

  @Get(':campaignId/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'How one campaign is doing: joins, finishers, completed tasks, rewards paid. Counted from real records.' })
  async analytics(
    @Param('merchantId') merchantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.analyticsService.forCampaign(campaignId, merchantId);
  }
}
