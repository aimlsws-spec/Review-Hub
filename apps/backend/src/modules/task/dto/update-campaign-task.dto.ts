import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceType, TaskCompletionLimit, VerificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { ENABLED_PROOF_TYPES } from '../../campaign/constants/enabled-types.constants';

export class UpdateCampaignTaskDto {
  @ApiPropertyOptional({ example: 'Follow us on Instagram' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ enum: VerificationType })
  @IsOptional()
  @IsEnum(VerificationType)
  verificationType?: VerificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  taskOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumTimeSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proofRequired?: boolean;

  @ApiPropertyOptional({ enum: ENABLED_PROOF_TYPES })
  @IsOptional()
  @IsIn(ENABLED_PROOF_TYPES, { message: `proofType must be one of: ${ENABLED_PROOF_TYPES.join(', ')}` })
  proofType?: EvidenceType;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: TaskCompletionLimit })
  @IsOptional()
  @IsEnum(TaskCompletionLimit)
  completionLimit?: TaskCompletionLimit;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxCompletionsPerPeriod?: number;
}
