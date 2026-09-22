import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { AudienceFilter } from '../interfaces';

const MAX_AGE = 120;
const MAX_LEVEL = 1000;
const MAX_DAYS = 3650;
const MAX_LOCATIONS = 100;

/** The targeting options on a broadcast. All optional and combined with AND; empty means every active app user. */
export class AudienceFilterDto implements AudienceFilter {
  @ApiPropertyOptional({ type: [String], description: 'Only users in these states' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LOCATIONS)
  @IsUUID('all', { each: true })
  stateIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Only users in these cities' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LOCATIONS)
  @IsUUID('all', { each: true })
  cityIds?: string[];

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @ApiPropertyOptional({ minimum: 13, maximum: MAX_AGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(13)
  @Max(MAX_AGE)
  minAge?: number;

  @ApiPropertyOptional({ minimum: 13, maximum: MAX_AGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(13)
  @Max(MAX_AGE)
  maxAge?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LEVEL })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LEVEL)
  minLevel?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LEVEL })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LEVEL)
  maxLevel?: number;

  @ApiPropertyOptional({ description: 'true: has an approved PAN. false: does not.' })
  @IsOptional()
  @IsBoolean()
  kycVerified?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_DAYS, description: 'Joined in the last N days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DAYS)
  joinedWithinDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_DAYS, description: 'Has not logged in for at least N days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DAYS)
  inactiveForDays?: number;
}
