import { Controller, Get, HttpCode, HttpStatus, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TdsStatus } from '@prisma/client';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';
import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { TdsReportService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/tds', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminTdsController {
  constructor(private readonly reportService: TdsReportService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tax kept back from user payouts in a financial year, with totals' })
  @ApiQuery({ name: 'financialYear', required: false, example: '2026-27' })
  @ApiQuery({ name: 'status', required: false, enum: TdsStatus })
  async list(
    @Query('financialYear') financialYear?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    if (status && !(status in TdsStatus)) throw new BadRequestException('status must be DEDUCTED or REVERSED');
    return this.reportService.list({
      financialYear,
      status: status as TdsStatus | undefined,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
    });
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download a financial year of TDS deductions as a CSV file, for the tax return' })
  @ApiQuery({ name: 'financialYear', required: false, example: '2026-27' })
  async export(@Res() res: Response, @Query('financialYear') financialYear?: string) {
    const { filename, content } = await this.reportService.exportCsv(financialYear);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }
}
