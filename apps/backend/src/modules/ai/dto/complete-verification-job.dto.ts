import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AiVerificationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export class CompleteVerificationJobDto {
  @ApiProperty({ enum: AiVerificationDecision })
  @IsEnum(AiVerificationDecision)
  decision!: AiVerificationDecision;

  @ApiProperty({ example: 0.92, description: 'Model confidence in its decision, 0-1' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @ApiPropertyOptional({ example: 0.05, description: 'Estimated fraud risk, 0-1' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fraudScore?: number;

  @ApiPropertyOptional({ example: 'Screenshot matches the requested Instagram post; no signs of tampering.' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Raw model output, stored as-is for audit purposes.' })
  @IsOptional()
  @IsObject()
  rawResponse?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'openai', description: 'Which engine produced this decision' })
  @IsOptional()
  @IsString()
  engine?: string;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 842, description: 'Wall-clock time the model call took, in milliseconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  processingTimeMs?: number;
}
