import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CityQueryDto, CreateCityDto, UpdateCityDto } from '../dto';
import { CityService } from '../services';

/** Manages the city picker's starter list (see prisma/seed-data/india-locations.ts) — states are already complete. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/locations', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get('states')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'States to pick from when adding a city' })
  async listStates() {
    return this.cityService.listStates();
  }

  @Get('cities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List cities, optionally filtered to one state and including switched-off ones' })
  async list(@Query() query: CityQueryDto) {
    return this.cityService.list(query);
  }

  @Post('cities')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a city to the picker' })
  async create(@Body() dto: CreateCityDto, @CurrentUser('id') adminId: string) {
    return this.cityService.create(dto, adminId);
  }

  @Patch('cities/:cityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a city, or switch it on/off the picker' })
  async update(@Param('cityId') cityId: string, @Body() dto: UpdateCityDto, @CurrentUser('id') adminId: string) {
    return this.cityService.update(cityId, dto, adminId);
  }
}
