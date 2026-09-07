import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFrequency } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateReportScheduleDto {
  @ApiProperty({ enum: ReportFrequency })
  @IsEnum(ReportFrequency)
  frequency!: ReportFrequency;

  @ApiProperty({ example: '2026-09-10T00:00:00.000Z' })
  @IsISO8601()
  nextRun!: string;

  @ApiProperty({ example: ['admin@viralkar.com'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipients!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
