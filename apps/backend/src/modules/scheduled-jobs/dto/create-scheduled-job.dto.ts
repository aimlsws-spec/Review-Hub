import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateScheduledJobDto {
  @ApiProperty({ example: 'nightly-settlement-generation' })
  @IsString()
  jobName!: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  jobType!: JobType;

  @ApiProperty({ example: '0 2 * * *' })
  @IsString()
  cronExpression!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  configuration?: Record<string, unknown>;
}
