import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { BroadcastQueryDto, BroadcastResponseDto, CreateBroadcastDto, PreviewAudienceDto } from '../dto';
import { BroadcastService } from '../services';

/** Admin tools for sending one message to many users. Every action here reaches real people, so it is admin-only. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/notifications', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminBroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Get('audience/locations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'States with their cities, for the audience location pickers' })
  async locations() {
    return this.broadcastService.listLocations();
  }

  @Post('broadcasts/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'How many users an audience matches, and how many each channel would reach' })
  async preview(@Body() dto: PreviewAudienceDto) {
    return this.broadcastService.previewAudience(dto.audience);
  }

  @Post('broadcasts')
  @HttpCode(HttpStatus.CREATED)
  // A deliberately low ceiling: a runaway script or a double-click must not be able to message everyone repeatedly.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message to an audience now, or schedule it for later' })
  @ApiOkResponse({ type: BroadcastResponseDto })
  async create(@Body() dto: CreateBroadcastDto, @CurrentUser('id') adminId: string) {
    return this.broadcastService.create(dto, adminId);
  }

  @Get('broadcasts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List broadcasts, newest first' })
  async list(@Query() query: BroadcastQueryDto) {
    return this.broadcastService.list(query);
  }

  @Get('broadcasts/:broadcastId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One broadcast with its delivery breakdown per channel' })
  async getOne(@Param('broadcastId', ParseUUIDPipe) broadcastId: string) {
    return this.broadcastService.getById(broadcastId);
  }

  @Post('broadcasts/:broadcastId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled broadcast that has not started yet' })
  @ApiOkResponse({ type: BroadcastResponseDto })
  async cancel(@Param('broadcastId', ParseUUIDPipe) broadcastId: string, @CurrentUser('id') adminId: string) {
    return this.broadcastService.cancel(broadcastId, adminId);
  }
}
