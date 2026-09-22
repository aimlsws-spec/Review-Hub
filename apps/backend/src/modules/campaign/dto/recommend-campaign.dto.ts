import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { CampaignGoal } from '../constants/campaign-builder.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** What a merchant tells the campaign builder before it recommends a campaign. */
export class RecommendCampaignDto {
  @ApiProperty({ enum: CampaignGoal, example: CampaignGoal.MORE_REVIEWS })
  @IsEnum(CampaignGoal)
  goal!: CampaignGoal;

  @ApiProperty({ example: 5000, description: 'What the merchant wants to spend on rewards, in rupees' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  @Max(1_000_000)
  budget!: number;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  durationDays?: number;

  @ApiPropertyOptional({ example: 'Free dessert with every main course this week' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  highlight?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', description: 'Defaults to tomorrow' })
  @IsOptional()
  @IsDateString()
  startAt?: string;
}
