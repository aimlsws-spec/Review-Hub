import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { MERCHANT_TEAM_PERMISSIONS } from '../../merchant/constants';
import { TeamRoles } from '../../merchant/decorators';
import { MerchantOwnershipGuard, MerchantTeamRoleGuard } from '../../merchant/guards';
import { CampaignOptimizerService } from '../services/campaign-optimizer.service';

/** Suggestions the daily optimizer found for this merchant. */
@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants/:merchantId/suggestions', version: '1' })
@UseGuards(MerchantOwnershipGuard)
@ApiBearerAuth()
export class MerchantSuggestionController {
  constructor(private readonly optimizerService: CampaignOptimizerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suggestions not yet dismissed, newest first' })
  async list(@Param('merchantId') merchantId: string) {
    return this.optimizerService.listOpen(merchantId);
  }

  @Post(':suggestionId/dismiss')
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a suggestion' })
  async dismiss(@Param('merchantId') merchantId: string, @Param('suggestionId') suggestionId: string) {
    return this.optimizerService.dismiss(merchantId, suggestionId);
  }
}
