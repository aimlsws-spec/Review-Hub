import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { AnalyticsQueryDto } from './analytics-query.dto';

/** The file types a merchant can download their campaign report as (spec §9.7: PDF, Excel, CSV). */
export const REPORT_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export class ReportExportQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_EXPORT_FORMATS, default: 'csv', description: 'csv opens anywhere; xlsx is an Excel workbook; pdf is for printing or sharing' })
  @IsOptional()
  @IsIn(REPORT_EXPORT_FORMATS)
  format: ReportExportFormat = 'csv';
}
