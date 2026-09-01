import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeCriteriaType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class CreateBadgeDto {
  @ApiProperty({ example: 'FIRST_REWARD' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'First Reward' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'Earned your first task reward.' })
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({ enum: BadgeCriteriaType })
  @IsEnum(BadgeCriteriaType)
  criteriaType!: BadgeCriteriaType;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  criteriaValue!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBadgeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ enum: BadgeCriteriaType })
  @IsOptional()
  @IsEnum(BadgeCriteriaType)
  criteriaType?: BadgeCriteriaType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  criteriaValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class BadgeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
