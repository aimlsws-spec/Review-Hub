import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceType, TaskType, VerificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({ enum: TaskType, example: TaskType.INSTAGRAM_FOLLOW })
  @IsEnum(TaskType)
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

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  proofType?: EvidenceType;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
