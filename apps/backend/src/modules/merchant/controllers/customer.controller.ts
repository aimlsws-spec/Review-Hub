import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';

import { CustomerQueryDto } from '../dto';
import { MerchantOwnershipGuard } from '../guards';
import { CustomerService } from '../services';

@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants/:merchantId/customers', version: '1' })
@UseGuards(MerchantOwnershipGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List this merchant's customers, derived from campaign participation" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Param('merchantId') merchantId: string, @Query() query: CustomerQueryDto) {
    return this.customerService.list(merchantId, query);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer stats (total, active, VIP, new)' })
  async getStats(@Param('merchantId') merchantId: string) {
    return this.customerService.getStats(merchantId);
  }
}
