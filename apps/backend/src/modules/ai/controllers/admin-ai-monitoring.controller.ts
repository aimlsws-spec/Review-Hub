import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { AiCallLogService } from '../../../shared/ai-call-log';
import { DashboardSeriesQueryDto } from '../../admin/dto';
import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';

/** How the platform's AI calls are doing: volume, errors and fallbacks, latency, tokens and cost. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/ai/monitoring', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminAiMonitoringController {
  constructor(private readonly aiCallLog: AiCallLogService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI calls per India day and per feature over the last N days (7–90, default 30)' })
  async getMonitoring(@Query() query: DashboardSeriesQueryDto) {
    return this.aiCallLog.monitoring(query.days ?? 30);
  }
}
