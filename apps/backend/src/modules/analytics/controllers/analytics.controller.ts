import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { AnalyticsEventQueryDto, DailyAnalyticsQueryDto, RecordAnalyticsEventDto } from '../dto';
import { AnalyticsService } from '../services';

@ApiTags(SWAGGER_TAGS.ANALYTICS)
@Controller({ path: 'admin/analytics', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List analytics events' })
  async listEvents(@Query() query: AnalyticsEventQueryDto) {
    return this.analyticsService.listEvents(query);
  }

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record an analytics event' })
  async recordEvent(@Body() dto: RecordAnalyticsEventDto) {
    return this.analyticsService.recordEvent(dto);
  }

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get daily platform analytics for a date range' })
  async getDaily(@Query() query: DailyAnalyticsQueryDto) {
    return this.analyticsService.getDailyRange(new Date(query.from), new Date(query.to));
  }

  @Get('merchants/:merchantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate analytics for a merchant' })
  async getMerchantAnalytics(@Param('merchantId') merchantId: string) {
    return this.analyticsService.getMerchantAnalytics(merchantId);
  }

  @Get('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate analytics for a user' })
  async getUserAnalytics(@Param('userId') userId: string) {
    return this.analyticsService.getUserAnalytics(userId);
  }
}
