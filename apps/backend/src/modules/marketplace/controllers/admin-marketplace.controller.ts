import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateMarketplaceItemDto, MarketplaceItemQueryDto, RedemptionQueryDto, UpdateMarketplaceItemDto } from '../dto';
import { MarketplaceItemAdminService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/marketplace', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminMarketplaceController {
  constructor(private readonly itemAdminService: MarketplaceItemAdminService) {}

  @Get('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List catalogue items' })
  async list(@Query() query: MarketplaceItemQueryDto) {
    return this.itemAdminService.list(query);
  }

  @Get('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a catalogue item' })
  async getById(@Param('itemId') itemId: string) {
    return this.itemAdminService.getById(itemId);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a catalogue item' })
  async create(@Body() dto: CreateMarketplaceItemDto, @CurrentUser('id') adminId: string) {
    return this.itemAdminService.create(dto, adminId);
  }

  @Patch('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a catalogue item' })
  async update(@Param('itemId') itemId: string, @Body() dto: UpdateMarketplaceItemDto, @CurrentUser('id') adminId: string) {
    return this.itemAdminService.update(itemId, dto, adminId);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a catalogue item' })
  async remove(@Param('itemId') itemId: string, @CurrentUser('id') adminId: string) {
    return this.itemAdminService.remove(itemId, adminId);
  }

  @Get('redemptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redemption history across all users' })
  async listRedemptions(@Query() query: RedemptionQueryDto) {
    return this.itemAdminService.listRedemptions(query.page, query.limit);
  }
}
