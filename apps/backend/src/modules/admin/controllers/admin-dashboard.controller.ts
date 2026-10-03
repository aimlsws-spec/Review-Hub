import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { DashboardSeriesQueryDto } from '../dto';
import { AdminDashboardService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/dashboard', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('series')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform activity per India day: commission, new users, campaigns, withdrawals, fraud flags' })
  async getSeries(@Query() query: DashboardSeriesQueryDto) {
    return this.dashboardService.getSeries(query.days ?? 30);
  }
}
