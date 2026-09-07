import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '../../common/constants';
import { PaginationQueryDto } from '../../common/dto';
import { SystemRole } from '../../common/enums';
import { Roles } from '../../modules/auth/decorators';
import { RolesGuard } from '../../modules/auth/guards';

import { RecordSystemMetricDto } from './dto';
import { HealthCheckRepository, SystemMetricRepository } from './repositories';

@ApiTags(SWAGGER_TAGS.HEALTH)
@Controller({ path: 'admin/health', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminHealthController {
  constructor(
    private readonly healthCheckRepository: HealthCheckRepository,
    private readonly systemMetricRepository: SystemMetricRepository,
  ) {}

  @Get('checks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List historical health checks' })
  async listChecks(@Query('service') service: string | undefined, @Query() query: PaginationQueryDto) {
    return this.healthCheckRepository.findRecent(service, query.page, query.limit);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List recorded system metrics' })
  async listMetrics(@Query('metric') metric: string | undefined, @Query() query: PaginationQueryDto) {
    return this.systemMetricRepository.findRecent(metric, query.page, query.limit);
  }

  @Post('metrics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a system metric data point' })
  async recordMetric(@Body() dto: RecordSystemMetricDto) {
    return this.systemMetricRepository.record(dto.metric, dto.value, dto.unit);
  }
}
