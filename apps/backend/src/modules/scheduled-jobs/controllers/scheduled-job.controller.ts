import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { PaginationQueryDto } from '@common/dto';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateScheduledJobDto, UpdateScheduledJobDto } from '../dto';
import { ScheduledJobService } from '../services';

@ApiTags(SWAGGER_TAGS.SCHEDULED_JOBS)
@Controller({ path: 'admin/scheduled-jobs', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class ScheduledJobController {
  constructor(private readonly scheduledJobService: ScheduledJobService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List scheduled jobs' })
  async list() {
    return this.scheduledJobService.list();
  }

  @Get(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a scheduled job' })
  async getById(@Param('jobId') jobId: string) {
    return this.scheduledJobService.getById(jobId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a scheduled job definition' })
  async create(@Body() dto: CreateScheduledJobDto, @CurrentUser('id') adminId: string) {
    return this.scheduledJobService.create(dto, adminId);
  }

  @Patch(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a scheduled job definition' })
  async update(@Param('jobId') jobId: string, @Body() dto: UpdateScheduledJobDto, @CurrentUser('id') adminId: string) {
    return this.scheduledJobService.update(jobId, dto, adminId);
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a scheduled job definition' })
  async remove(@Param('jobId') jobId: string, @CurrentUser('id') adminId: string) {
    return this.scheduledJobService.remove(jobId, adminId);
  }

  @Get(':jobId/logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List execution logs for a scheduled job' })
  async listLogs(@Param('jobId') jobId: string, @Query() query: PaginationQueryDto) {
    return this.scheduledJobService.listExecutionLogs(jobId, query.page, query.limit);
  }
}
