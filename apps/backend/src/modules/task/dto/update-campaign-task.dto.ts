import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceType, VerificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  proofType?: EvidenceType;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
