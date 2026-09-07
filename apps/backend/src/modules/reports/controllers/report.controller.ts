import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateReportDto, CreateReportScheduleDto, ReportQueryDto } from '../dto';
import { ReportService } from '../services';

@ApiTags(SWAGGER_TAGS.REPORTS)
@Controller({ path: 'admin/reports', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List generated/requested reports' })
  async list(@Query() query: ReportQueryDto) {
    return this.reportService.list(query);
  }

  @Get(':reportId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a report' })
  async getById(@Param('reportId') reportId: string) {
    return this.reportService.getById(reportId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a new report' })
  async create(@Body() dto: CreateReportDto, @CurrentUser('id') adminId: string) {
    return this.reportService.create(dto, adminId);
  }

  @Post(':reportId/schedule')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a recurring schedule to a report' })
  async setSchedule(
    @Param('reportId') reportId: string,
    @Body() dto: CreateReportScheduleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reportService.setSchedule(reportId, dto, adminId);
  }

  @Patch(':reportId/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a report's schedule" })
  async updateSchedule(@Param('reportId') reportId: string, @Body() dto: Partial<CreateReportScheduleDto>) {
    return this.reportService.updateSchedule(reportId, dto);
  }
}
