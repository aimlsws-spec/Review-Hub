import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto';
import { FeatureFlagService } from '../services';

@ApiTags(SWAGGER_TAGS.SETTINGS)
@Controller({ path: 'admin/feature-flags', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List feature flags' })
  async list() {
    return this.featureFlagService.list();
  }

  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a feature flag' })
  async getByKey(@Param('key') key: string) {
    return this.featureFlagService.getByKey(key);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a feature flag' })
  async create(@Body() dto: CreateFeatureFlagDto, @CurrentUser('id') adminId: string) {
    return this.featureFlagService.create(dto, adminId);
  }

  @Patch(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a feature flag' })
  async update(@Param('key') key: string, @Body() dto: UpdateFeatureFlagDto, @CurrentUser('id') adminId: string) {
    return this.featureFlagService.update(key, dto, adminId);
  }
}
