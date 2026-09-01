import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateDailyRewardPrizeDto, DailyRewardPrizeQueryDto, UpdateDailyRewardPrizeDto } from '../dto';
import { DailyRewardPrizeAdminService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/gamification/prizes', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminDailyRewardPrizeController {
  constructor(private readonly prizeAdminService: DailyRewardPrizeAdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List daily reward prizes' })
  async list(@Query() query: DailyRewardPrizeQueryDto) {
    return this.prizeAdminService.list(query);
  }

  @Get(':prizeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a daily reward prize' })
  async getById(@Param('prizeId') prizeId: string) {
    return this.prizeAdminService.getById(prizeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a daily reward prize' })
  async create(@Body() dto: CreateDailyRewardPrizeDto, @CurrentUser('id') adminId: string) {
    return this.prizeAdminService.create(dto, adminId);
  }

  @Patch(':prizeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a daily reward prize' })
  async update(@Param('prizeId') prizeId: string, @Body() dto: UpdateDailyRewardPrizeDto, @CurrentUser('id') adminId: string) {
    return this.prizeAdminService.update(prizeId, dto, adminId);
  }

  @Delete(':prizeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a daily reward prize' })
  async remove(@Param('prizeId') prizeId: string, @CurrentUser('id') adminId: string) {
    return this.prizeAdminService.remove(prizeId, adminId);
  }
}
