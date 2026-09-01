import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { BadgeQueryDto, CreateBadgeDto, UpdateBadgeDto } from '../dto';
import { BadgeAdminService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/gamification/badges', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminBadgeController {
  constructor(private readonly badgeAdminService: BadgeAdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List badges' })
  async list(@Query() query: BadgeQueryDto) {
    return this.badgeAdminService.list(query);
  }

  @Get(':badgeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a badge' })
  async getById(@Param('badgeId') badgeId: string) {
    return this.badgeAdminService.getById(badgeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a badge' })
  async create(@Body() dto: CreateBadgeDto, @CurrentUser('id') adminId: string) {
    return this.badgeAdminService.create(dto, adminId);
  }

  @Patch(':badgeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a badge' })
  async update(@Param('badgeId') badgeId: string, @Body() dto: UpdateBadgeDto, @CurrentUser('id') adminId: string) {
    return this.badgeAdminService.update(badgeId, dto, adminId);
  }

  @Delete(':badgeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a badge' })
  async remove(@Param('badgeId') badgeId: string, @CurrentUser('id') adminId: string) {
    return this.badgeAdminService.remove(badgeId, adminId);
  }
}
