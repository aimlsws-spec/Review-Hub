import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { SettlementQueryDto } from '../dto';
import { SettlementService } from '../services';

@ApiTags(SWAGGER_TAGS.SETTLEMENTS)
@Controller({ path: 'merchants/:merchantId/settlements', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's settlement reports" })
  async list(@Param('merchantId') merchantId: string, @Query() query: SettlementQueryDto) {
    return this.settlementService.listForMerchant(merchantId, query.page, query.limit);
  }
}
