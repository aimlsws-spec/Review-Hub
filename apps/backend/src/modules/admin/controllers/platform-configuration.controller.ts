import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { UpdatePlatformConfigurationDto } from '../dto';
import { PlatformConfigurationService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/platform-configuration', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class PlatformConfigurationController {
  constructor(private readonly platformConfigurationService: PlatformConfigurationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform configuration' })
  async get() {
    return this.platformConfigurationService.get();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update platform configuration' })
  async update(@Body() dto: UpdatePlatformConfigurationDto, @CurrentUser('id') adminId: string) {
    return this.platformConfigurationService.update(dto, adminId);
  }
}
