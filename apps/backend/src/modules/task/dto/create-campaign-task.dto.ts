import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceType, TaskType, VerificationType, TaskCompletionLimit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { ENABLED_PROOF_TYPES, ENABLED_TASK_TYPES } from '../../campaign/constants/enabled-types.constants';

export class CreateCampaignTaskDto {
  @ApiProperty({ example: 'Follow us on Instagram' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ example: 'Follow our official Instagram account' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Open Instagram, search for @viralkar, tap Follow' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ enum: ENABLED_TASK_TYPES, example: TaskType.INSTAGRAM_FOLLOW })
  @IsIn(ENABLED_TASK_TYPES, { message: `taskType must be one of: ${ENABLED_TASK_TYPES.join(', ')}` })
  taskType!: TaskType;

  @ApiPropertyOptional({ enum: VerificationType, default: VerificationType.AI })
  @IsOptional()
  @IsEnum(VerificationType)
  verificationType?: VerificationType;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  taskOrder?: number;

  @ApiPropertyOptional({ example: 10, description: 'Overrides the campaign-level reward for this task, if set' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumTimeSeconds?: number;

  @ApiPropertyOptional({ default: true })
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

  @ApiPropertyOptional({ enum: TaskCompletionLimit, default: TaskCompletionLimit.ONCE })
  @IsOptional()
  @IsEnum(TaskCompletionLimit)
  completionLimit?: TaskCompletionLimit;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxCompletionsPerPeriod?: number;
}
