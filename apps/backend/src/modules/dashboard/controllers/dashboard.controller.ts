import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators';

import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@Controller({ path: 'dashboard', version: '1' })
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('home')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregated mobile home dashboard data' })
  async getHome(@CurrentUser('id') userId: string) {
    return this.dashboardService.getHomeDashboard(userId);
  }
}
