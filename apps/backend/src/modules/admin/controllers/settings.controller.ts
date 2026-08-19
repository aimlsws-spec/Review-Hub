import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from '../dto';
import { SettingsService } from '../services';

@ApiTags(SWAGGER_TAGS.SETTINGS)
@Controller({ path: 'admin/settings', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List system settings' })
  async list(@Query('category') category?: string) {
    return this.settingsService.list(category);
  }

  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a system setting' })
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a system setting' })
  async create(@Body() dto: CreateSystemSettingDto, @CurrentUser('id') adminId: string) {
    return this.settingsService.create(dto, adminId);
  }

  @Patch(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a system setting value' })
  async update(@Param('key') key: string, @Body() dto: UpdateSystemSettingDto, @CurrentUser('id') adminId: string) {
    return this.settingsService.update(key, dto, adminId);
  }
}
