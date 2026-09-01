import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { MarketplaceItemQueryDto, RedemptionQueryDto } from '../dto';
import { MarketplaceService } from '../services';

@ApiTags(SWAGGER_TAGS.MARKETPLACE)
@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('items')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List redeemable catalogue items' })
  async listItems(@Query() query: MarketplaceItemQueryDto) {
    return this.marketplaceService.listItems(query.page, query.limit, query.category);
  }

  @Post('items/:itemId/redeem')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a catalogue item with my wallet balance' })
  async redeem(@CurrentUser('id') userId: string, @Param('itemId') itemId: string) {
    return this.marketplaceService.redeem(userId, itemId);
  }

  @Get('redemptions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My redemption history' })
  async myRedemptions(@CurrentUser('id') userId: string, @Query() query: RedemptionQueryDto) {
    return this.marketplaceService.listMyRedemptions(userId, query.page, query.limit);
  }
}
