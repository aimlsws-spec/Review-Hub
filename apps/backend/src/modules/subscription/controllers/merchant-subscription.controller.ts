import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { MERCHANT_TEAM_PERMISSIONS } from '../../merchant/constants';
import { TeamRoles } from '../../merchant/decorators';
import { MerchantOwnershipGuard, MerchantTeamRoleGuard } from '../../merchant/guards';
import { SubscribeDto } from '../dto';
import { MerchantSubscriptionService } from '../services';

/** A merchant's plan and featured campaigns. Paying is account work, so only owners and admins of the team may do it. */
@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants/:merchantId', version: '1' })
@UseGuards(MerchantOwnershipGuard)
@ApiBearerAuth()
export class MerchantSubscriptionController {
  constructor(private readonly subscriptionService: MerchantSubscriptionService) {}

  @Get('subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My current plan, the plans on offer, and the price of featuring a campaign' })
  async getOverview(@Param('merchantId') merchantId: string) {
    return this.subscriptionService.getOverview(merchantId);
  }

  @Post('subscription')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_ACCOUNT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to a plan, paying the first month (GST added) from the wallet' })
  async subscribe(@Param('merchantId') merchantId: string, @Body() dto: SubscribeDto) {
    return this.subscriptionService.subscribe(merchantId, dto.planId);
  }

  @Post('subscription/cancel')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_ACCOUNT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop renewing; the plan lasts until the paid month ends' })
  async cancel(@Param('merchantId') merchantId: string) {
    return this.subscriptionService.cancel(merchantId);
  }

  @Post('subscription/resume')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_ACCOUNT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo a cancellation before the month ends' })
  async resume(@Param('merchantId') merchantId: string) {
    return this.subscriptionService.resume(merchantId);
  }

  @Post('campaigns/:campaignId/feature')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_ACCOUNT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Feature a running campaign (free within the plan slots, otherwise paid from the wallet)' })
  async feature(@Param('merchantId') merchantId: string, @Param('campaignId') campaignId: string) {
    return this.subscriptionService.featureCampaign(merchantId, campaignId);
  }
}
