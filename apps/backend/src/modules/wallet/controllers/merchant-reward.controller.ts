import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { WalletService } from '../services';

@ApiTags(SWAGGER_TAGS.REWARDS)
@Controller({ path: 'merchants/:merchantId/rewards', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class MerchantRewardController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rewards paid out across this merchant\'s campaigns' })
  async list(
    @Param('merchantId') merchantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.walletService.getMerchantRewards(merchantId, Number(page), Number(limit));
  }
}
